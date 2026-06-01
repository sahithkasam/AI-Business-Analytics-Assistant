"""
Excel/CSV upload → dynamic PostgreSQL table → auto dashboard generation.
"""
import logging
import re
import uuid
from io import BytesIO
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ai.sql_engine import TextToSQLEngine
from database.connection import get_db
from models.dataset import UploadedDataset
from models.user import User
from utils.security import require_any_role
from utils.sql_executor import execute_safe_sql

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/upload", tags=["Upload"])

MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_ROWS = 50_000
ALLOWED_EXTENSIONS = {".xlsx", ".xls", ".csv"}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _safe_table_name(dataset_id: uuid.UUID) -> str:
    return "ds_" + str(dataset_id).replace("-", "")[:16]


def _sanitize_col(name: str) -> str:
    name = re.sub(r"[^a-zA-Z0-9_]", "_", str(name).strip())
    name = re.sub(r"_+", "_", name).strip("_").lower() or "col"
    if name[0].isdigit():
        name = "col_" + name
    return name[:63]


def _pg_type(dtype) -> str:
    s = str(dtype)
    if "int" in s:
        return "BIGINT"
    if "float" in s:
        return "DOUBLE PRECISION"
    if "bool" in s:
        return "BOOLEAN"
    if "datetime" in s or "timestamp" in s:
        return "TIMESTAMP"
    if "date" in s:
        return "DATE"
    return "TEXT"


def _analyze(df: pd.DataFrame, col_map: dict[str, str]) -> tuple[list, list]:
    """Return (kpi_columns, chart_suggestions) using rule-based column inspection."""
    num_cols = [col_map[c] for c in df.select_dtypes(include="number").columns if c in col_map]
    date_cols = [col_map[c] for c in df.select_dtypes(include=["datetime64", "datetimetz"]).columns if c in col_map]
    text_cols = [col_map[c] for c in df.select_dtypes(include="object").columns if c in col_map]

    money_kw = {"amount", "revenue", "sales", "cost", "price", "total", "income", "profit", "value", "spend"}
    kpis = []
    for col in num_cols[:4]:
        agg = "sum" if any(k in col.lower() for k in money_kw) else "avg"
        kpis.append({"label": col.replace("_", " ").title(), "col": col, "agg": agg})

    charts = []
    if date_cols and num_cols:
        charts.append({
            "type": "line",
            "x": date_cols[0],
            "y": num_cols[0],
            "title": f"{num_cols[0].replace('_', ' ').title()} over Time",
        })
    if text_cols and num_cols:
        charts.append({
            "type": "bar",
            "x": text_cols[0],
            "y": num_cols[0],
            "title": f"{num_cols[0].replace('_', ' ').title()} by {text_cols[0].replace('_', ' ').title()}",
        })
        orig = next((k for k, v in col_map.items() if v == text_cols[0]), None)
        if orig and df[orig].nunique() <= 8:
            charts.append({
                "type": "pie",
                "x": text_cols[0],
                "y": num_cols[0],
                "title": f"{num_cols[0].replace('_', ' ').title()} Distribution",
            })
    if len(num_cols) >= 2 and not date_cols and not charts:
        charts.append({
            "type": "scatter",
            "x": num_cols[0],
            "y": num_cols[1],
            "title": f"{num_cols[0].replace('_', ' ').title()} vs {num_cols[1].replace('_', ' ').title()}",
        })

    return kpis, charts[:3]


def _build_dataset_schema(dataset: UploadedDataset) -> str:
    cols = "\n".join(
        f"  - {c['name']} ({c['pg_type']})"
        for c in dataset.columns_meta
    )
    return (
        f"Table: {dataset.table_name} (uploaded dataset: \"{dataset.name}\")\n"
        f"Columns:\n{cols}\n\n"
        "Note: This is an uploaded dataset table. Query it directly by its table name."
    )


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/excel")
async def upload_excel(
    file: UploadFile = File(...),
    current_user: User = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    """Upload an Excel (.xlsx/.xls) or CSV file and auto-create a PostgreSQL table."""
    # Validate extension
    filename = file.filename or "upload"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'. Use .xlsx, .xls, or .csv")

    # Read bytes
    raw = await file.read()
    if len(raw) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 10 MB.")

    # Parse into DataFrame
    try:
        if ext == ".csv":
            df = pd.read_csv(BytesIO(raw))
        else:
            df = pd.read_excel(BytesIO(raw), engine="openpyxl" if ext == ".xlsx" else "xlrd")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {e}")

    if df.empty:
        raise HTTPException(status_code=422, detail="File contains no data.")
    if len(df) > MAX_ROWS:
        df = df.head(MAX_ROWS)

    # Sanitize column names, resolve duplicates
    col_map: dict[str, str] = {}
    seen: dict[str, int] = {}
    for orig in df.columns:
        safe = _sanitize_col(str(orig))
        if safe in seen:
            seen[safe] += 1
            safe = f"{safe}_{seen[safe]}"
        else:
            seen[safe] = 0
        col_map[orig] = safe
    df.rename(columns=col_map, inplace=True)

    # Try to parse date-like text columns
    for col in df.select_dtypes(include="object").columns:
        try:
            parsed = pd.to_datetime(df[col], infer_datetime_format=True)
            if parsed.notna().sum() / max(len(df), 1) > 0.8:
                df[col] = parsed
        except Exception:
            pass

    # Build column metadata
    columns_meta = []
    for col in df.columns:
        pg_t = _pg_type(df[col].dtype)
        samples = [str(v) for v in df[col].dropna().head(3).tolist()]
        columns_meta.append({"name": col, "pg_type": pg_t, "sample_values": samples})

    # Analyze for KPIs and charts (use original-name→safe-name map on the sanitized df)
    # Build reverse map for dtype detection (safe names are now the df columns)
    safe_to_safe = {c: c for c in df.columns}
    kpis, charts = _analyze(df, safe_to_safe)

    # Generate IDs and table name
    dataset_id = uuid.uuid4()
    table_name = _safe_table_name(dataset_id)
    dataset_name = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()

    # Create PostgreSQL table
    col_defs = ", ".join(f'"{c["name"]}" {c["pg_type"]}' for c in columns_meta)
    create_sql = f'CREATE TABLE IF NOT EXISTS "{table_name}" (id SERIAL PRIMARY KEY, {col_defs})'
    try:
        await db.execute(text(create_sql))
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create table: {e}")

    # Bulk insert rows
    col_names = [c["name"] for c in columns_meta]
    quoted_cols = ", ".join(f'"{c}"' for c in col_names)
    placeholders = ", ".join(f":{c}" for c in col_names)
    insert_sql = f'INSERT INTO "{table_name}" ({quoted_cols}) VALUES ({placeholders})'

    rows_to_insert = []
    for _, row in df.iterrows():
        record: dict[str, Any] = {}
        for col in col_names:
            val = row[col]
            if pd.isna(val) if not isinstance(val, str) else False:
                record[col] = None
            elif hasattr(val, "item"):
                record[col] = val.item()
            else:
                record[col] = val
        rows_to_insert.append(record)

    try:
        await db.execute(text(insert_sql), rows_to_insert)
        await db.commit()
    except Exception as e:
        await db.rollback()
        await db.execute(text(f'DROP TABLE IF EXISTS "{table_name}"'))
        await db.commit()
        raise HTTPException(status_code=500, detail=f"Failed to insert data: {e}")

    # Save metadata record
    dataset = UploadedDataset(
        id=dataset_id,
        user_id=current_user.id,
        name=dataset_name,
        original_filename=filename,
        table_name=table_name,
        row_count=len(df),
        columns_meta=columns_meta,
        kpi_columns=kpis,
        chart_suggestions=charts,
    )
    db.add(dataset)
    await db.commit()
    await db.refresh(dataset)

    return {
        "id": str(dataset.id),
        "name": dataset.name,
        "original_filename": dataset.original_filename,
        "table_name": dataset.table_name,
        "row_count": dataset.row_count,
        "columns_meta": dataset.columns_meta,
        "kpi_columns": dataset.kpi_columns,
        "chart_suggestions": dataset.chart_suggestions,
        "created_at": dataset.created_at.isoformat(),
    }


@router.get("/datasets")
async def list_datasets(
    current_user: User = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    """List all datasets uploaded by the current user."""
    result = await db.execute(
        text("SELECT id, name, original_filename, table_name, row_count, columns_meta, created_at "
             "FROM uploaded_datasets WHERE user_id = :uid ORDER BY created_at DESC"),
        {"uid": current_user.id},
    )
    rows = result.fetchall()
    return [
        {
            "id": str(r[0]),
            "name": r[1],
            "original_filename": r[2],
            "table_name": r[3],
            "row_count": r[4],
            "column_count": len(r[5]) if r[5] else 0,
            "columns_meta": r[5],
            "created_at": r[6].isoformat(),
        }
        for r in rows
    ]


@router.get("/datasets/{dataset_id}")
async def get_dataset(
    dataset_id: str,
    current_user: User = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    """Get dataset metadata, KPI values, and sample data."""
    result = await db.execute(
        text("SELECT id, name, original_filename, table_name, row_count, columns_meta, "
             "kpi_columns, chart_suggestions, created_at "
             "FROM uploaded_datasets WHERE id = :id AND user_id = :uid"),
        {"id": dataset_id, "uid": current_user.id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    table_name = row[3]
    kpi_columns: list = row[6] or []
    chart_suggestions: list = row[7] or []

    # Compute KPI values
    kpi_values = []
    for kpi in kpi_columns:
        col = kpi["col"]
        agg = kpi["agg"]
        try:
            r = await db.execute(text(f'SELECT {agg}("{col}") FROM "{table_name}"'))
            val = r.scalar()
            kpi_values.append({
                "label": kpi["label"],
                "col": col,
                "agg": agg,
                "value": float(val) if val is not None else 0,
            })
        except Exception:
            kpi_values.append({"label": kpi["label"], "col": col, "agg": agg, "value": 0})

    # Fetch preview rows (first 200)
    try:
        preview = await db.execute(text(f'SELECT * FROM "{table_name}" LIMIT 200'))
        preview_rows = preview.fetchall()
        preview_keys = list(preview.keys())
        sample_data = [dict(zip(preview_keys, r)) for r in preview_rows]
        # Serialize
        from utils.sql_executor import _serialize_value
        sample_data = [{k: _serialize_value(v) for k, v in row.items()} for row in sample_data]
        columns = [{"name": k} for k in preview_keys]
    except Exception:
        sample_data = []
        columns = []

    # Fetch chart data for each suggestion
    chart_data = []
    for suggestion in chart_suggestions:
        x_col = suggestion["x"]
        y_col = suggestion["y"]
        chart_type = suggestion["type"]
        try:
            if chart_type in ("bar", "pie"):
                q = f'SELECT "{x_col}", SUM("{y_col}") as value FROM "{table_name}" GROUP BY "{x_col}" ORDER BY value DESC LIMIT 20'
            else:
                q = f'SELECT "{x_col}", "{y_col}" FROM "{table_name}" ORDER BY 1 LIMIT 500'
            r = await db.execute(text(q))
            c_rows = r.fetchall()
            c_keys = list(r.keys())
            chart_data.append({
                "type": chart_type,
                "x": x_col,
                "y": y_col,
                "title": suggestion["title"],
                "data": [dict(zip(c_keys, cr)) for cr in c_rows],
            })
        except Exception:
            pass

    return {
        "id": str(row[0]),
        "name": row[1],
        "original_filename": row[2],
        "table_name": table_name,
        "row_count": row[4],
        "columns_meta": row[5],
        "kpi_values": kpi_values,
        "chart_data": chart_data,
        "sample_data": sample_data,
        "columns": columns,
        "created_at": row[8].isoformat(),
    }


@router.post("/datasets/{dataset_id}/query")
async def query_dataset(
    dataset_id: str,
    payload: dict,
    current_user: User = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    """Ask an AI natural language question about a specific uploaded dataset."""
    question = payload.get("question", "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question is required.")

    result = await db.execute(
        text("SELECT id, name, table_name, columns_meta FROM uploaded_datasets WHERE id = :id AND user_id = :uid"),
        {"id": dataset_id, "uid": current_user.id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    dataset_schema = _build_dataset_schema(
        type("D", (), {"table_name": row[2], "name": row[1], "columns_meta": row[3]})()
    )

    async def db_executor(sql: str):
        return await execute_safe_sql(db, sql)

    engine = TextToSQLEngine(db_executor)
    ai_result = await engine.process_query(
        natural_query=question,
        schema=dataset_schema,
        user_id=str(current_user.id),
    )
    return ai_result


@router.delete("/datasets/{dataset_id}")
async def delete_dataset(
    dataset_id: str,
    current_user: User = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    """Delete an uploaded dataset and drop its PostgreSQL table."""
    result = await db.execute(
        text("SELECT table_name FROM uploaded_datasets WHERE id = :id AND user_id = :uid"),
        {"id": dataset_id, "uid": current_user.id},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    table_name = row[0]
    await db.execute(text(f'DROP TABLE IF EXISTS "{table_name}"'))
    await db.execute(text("DELETE FROM uploaded_datasets WHERE id = :id"), {"id": dataset_id})
    await db.commit()
    return {"detail": "Dataset deleted."}
