"""
Safe SQL executor with timeout, row limits, and type serialization.
"""
import asyncio
import logging
from decimal import Decimal
from datetime import date, datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from config.settings import settings

logger = logging.getLogger(__name__)


def _serialize_value(v: Any) -> Any:
    """Convert non-JSON-serializable types to Python primitives."""
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    if hasattr(v, "__str__"):
        return str(v)
    return v


async def execute_safe_sql(
    session: AsyncSession,
    sql: str,
    max_rows: int = settings.MAX_RESULT_ROWS,
    timeout_seconds: int = settings.MAX_QUERY_EXECUTION_TIME,
) -> dict[str, Any]:
    """
    Execute a validated SELECT query with:
    - Statement timeout enforced at DB level
    - Row count limit
    - Safe serialization of result types
    """
    # Enforce row limit
    limited_sql = f"SELECT * FROM ({sql}) AS _q LIMIT {max_rows}"

    async def _run():
        # Set per-statement timeout
        await session.execute(text(f"SET LOCAL statement_timeout = '{timeout_seconds * 1000}ms'"))
        result = await session.execute(text(limited_sql))
        rows = result.fetchall()
        keys = list(result.keys())
        return rows, keys

    try:
        rows, keys = await asyncio.wait_for(_run(), timeout=timeout_seconds + 5)
    except asyncio.TimeoutError:
        raise RuntimeError(f"Query exceeded maximum execution time of {timeout_seconds} seconds")

    # Build column metadata
    columns = []
    data = []

    if rows:
        for key in keys:
            # Infer type from first non-null value
            sample_val = next(
                (getattr(row, key, None) for row in rows[:5] if getattr(row, key, None) is not None),
                None,
            )
            if isinstance(sample_val, (int,)):
                col_type = "integer"
            elif isinstance(sample_val, (float, Decimal)):
                col_type = "number"
            elif isinstance(sample_val, (datetime, date)):
                col_type = "datetime"
            elif isinstance(sample_val, bool):
                col_type = "boolean"
            else:
                col_type = "string"
            columns.append({"name": key, "type": col_type})

        for row in rows:
            data.append({k: _serialize_value(getattr(row, k, None)) for k in keys})
    else:
        for key in keys:
            columns.append({"name": key, "type": "string"})

    return {"columns": columns, "data": data, "row_count": len(data)}
