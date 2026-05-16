"""
CSV and PDF export endpoints.
"""
import csv
import io
import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ai.sql_engine import validate_sql, SQLSafetyError
from database.connection import get_db
from models.analytics import QueryHistory
from models.user import User
from services.schemas import ExportRequest
from utils.security import require_any_role
from utils.sql_executor import execute_safe_sql

router = APIRouter(prefix="/export", tags=["Export"])


@router.post("/csv")
async def export_csv(
    payload: ExportRequest,
    current_user: User = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    """Export query results as CSV."""
    sql = await _resolve_sql(payload, current_user, db)

    try:
        result = await execute_safe_sql(db, sql, max_rows=50000)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query execution failed: {str(e)}")

    # Build CSV in memory
    output = io.StringIO()
    if result["data"]:
        writer = csv.DictWriter(output, fieldnames=[c["name"] for c in result["columns"]])
        writer.writeheader()
        writer.writerows(result["data"])
    else:
        output.write("No data returned\n")

    output.seek(0)
    filename = f"analytics_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/pdf")
async def export_pdf(
    payload: ExportRequest,
    current_user: User = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    """Export query results as a PDF report."""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import inch
        from reportlab.platypus import (
            SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        )
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="PDF export requires reportlab. Install with: pip install reportlab",
        )

    sql = await _resolve_sql(payload, current_user, db)

    try:
        result = await execute_safe_sql(db, sql, max_rows=1000)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query execution failed: {str(e)}")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4))
    styles = getSampleStyleSheet()
    story = []

    # Title
    title = payload.title or "Analytics Report"
    story.append(Paragraph(title, styles["Title"]))
    story.append(Paragraph(
        f"Generated: {datetime.now().strftime('%B %d, %Y %H:%M')} | "
        f"User: {current_user.full_name or current_user.username} | "
        f"Rows: {result['row_count']:,}",
        styles["Normal"],
    ))
    story.append(Spacer(1, 0.2 * inch))

    if result["data"]:
        headers = [c["name"].replace("_", " ").title() for c in result["columns"]]
        table_data = [headers]
        for row in result["data"][:500]:  # cap at 500 rows for PDF
            table_data.append([str(v) if v is not None else "" for v in row.values()])

        col_count = len(headers)
        col_width = (landscape(A4)[0] - 1.5 * inch) / col_count

        table = Table(table_data, colWidths=[col_width] * col_count, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e40af")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("FONTSIZE", (0, 1), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4ff")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#d1d5db")),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(table)
    else:
        story.append(Paragraph("No data returned for this query.", styles["Normal"]))

    doc.build(story)
    buffer.seek(0)

    filename = f"analytics_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


async def _resolve_sql(payload: ExportRequest, user: User, db: AsyncSession) -> str:
    if payload.query_id:
        result = await db.execute(
            select(QueryHistory).where(
                QueryHistory.id == payload.query_id,
                QueryHistory.user_id == user.id,
            )
        )
        hist = result.scalar_one_or_none()
        if not hist:
            raise HTTPException(status_code=404, detail="Query history item not found")
        sql = hist.corrected_sql or hist.generated_sql
    elif payload.sql:
        sql = payload.sql
    else:
        raise HTTPException(status_code=400, detail="Provide query_id or sql")

    try:
        return validate_sql(sql)
    except SQLSafetyError as e:
        raise HTTPException(status_code=400, detail=str(e))
