"""
Query endpoint — natural language → SQL → results → insights (with streaming).
"""
import asyncio
import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from ai.schema_inspector import get_schema_description
from ai.sql_engine import TextToSQLEngine
from database.connection import get_db
from models.analytics import QueryHistory, QueryStatus, ChartType
from models.user import User
from services.schemas import QueryRequest, QueryResponse
from utils.security import require_any_role
from utils.sql_executor import execute_safe_sql

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/query", tags=["Analytics Query"])


def _chart_str_to_enum(chart_type: str) -> ChartType:
    mapping = {t.value: t for t in ChartType}
    return mapping.get(chart_type, ChartType.TABLE)


@router.post("/ask", response_model=QueryResponse)
async def ask_question(
    payload: QueryRequest,
    current_user: User = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    """Convert a natural language question to SQL, execute it, and return insights."""

    # Fetch live schema for context
    try:
        schema = await get_schema_description(db)
    except Exception as e:
        logger.error(f"Schema fetch failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch database schema")

    # Create DB executor closure
    async def db_executor(sql: str):
        return await execute_safe_sql(db, sql)

    # Run AI pipeline
    engine = TextToSQLEngine(db_executor)
    result = await engine.process_query(
        natural_query=payload.question,
        schema=schema,
        user_id=str(current_user.id),
    )

    # Persist to history
    history = QueryHistory(
        user_id=current_user.id,
        natural_language_query=payload.question,
        generated_sql=result.get("generated_sql"),
        corrected_sql=result.get("corrected_sql"),
        sql_explanation=result.get("sql_explanation"),
        execution_time_ms=result.get("execution_time_ms"),
        row_count=result.get("row_count"),
        status=QueryStatus(result.get("status", "failed")),
        error_message=result.get("error"),
        retry_count=result.get("retry_count", 0),
        chart_type=_chart_str_to_enum(result.get("chart_type", "table")),
        result_preview=result.get("data", [])[:5],
        insights=result.get("insights"),
    )
    db.add(history)
    await db.commit()
    await db.refresh(history)

    return QueryResponse(
        id=history.id,
        natural_query=result["natural_query"],
        generated_sql=result.get("generated_sql"),
        corrected_sql=result.get("corrected_sql"),
        sql_explanation=result.get("sql_explanation"),
        columns=result.get("columns", []),
        data=result.get("data", []),
        row_count=result.get("row_count", 0),
        chart_type=result.get("chart_type", "table"),
        insights=result.get("insights"),
        execution_time_ms=result.get("execution_time_ms", 0),
        retry_count=result.get("retry_count", 0),
        status=result.get("status", "failed"),
        error=result.get("error"),
        created_at=history.created_at,
    )


@router.post("/ask/stream")
async def ask_question_stream(
    payload: QueryRequest,
    current_user: User = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    """Streaming version — sends SSE events for real-time UI updates."""

    async def event_generator():
        status_queue: asyncio.Queue = asyncio.Queue()

        async def stream_callback(message: str):
            await status_queue.put({"type": "status", "message": message})

        async def run_pipeline():
            try:
                schema = await get_schema_description(db)

                async def db_executor(sql: str):
                    return await execute_safe_sql(db, sql)

                engine = TextToSQLEngine(db_executor)
                result = await engine.process_query(
                    natural_query=payload.question,
                    schema=schema,
                    user_id=str(current_user.id),
                    stream_callback=stream_callback,
                )

                # Save to history
                history = QueryHistory(
                    user_id=current_user.id,
                    natural_language_query=payload.question,
                    generated_sql=result.get("generated_sql"),
                    corrected_sql=result.get("corrected_sql"),
                    sql_explanation=result.get("sql_explanation"),
                    execution_time_ms=result.get("execution_time_ms"),
                    row_count=result.get("row_count"),
                    status=QueryStatus(result.get("status", "failed")),
                    error_message=result.get("error"),
                    retry_count=result.get("retry_count", 0),
                    chart_type=_chart_str_to_enum(result.get("chart_type", "table")),
                    result_preview=result.get("data", [])[:5],
                    insights=result.get("insights"),
                )
                db.add(history)
                await db.commit()
                await db.refresh(history)

                result["id"] = str(history.id)
                await status_queue.put({"type": "result", "data": result})
            except Exception as e:
                await status_queue.put({"type": "error", "message": str(e)})
            finally:
                await status_queue.put(None)  # sentinel

        task = asyncio.create_task(run_pipeline())

        while True:
            item = await status_queue.get()
            if item is None:
                break
            yield f"data: {json.dumps(item)}\n\n"

        await task

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
