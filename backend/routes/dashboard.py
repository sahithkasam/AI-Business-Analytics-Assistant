"""
Dashboard KPIs and overview analytics endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from database.connection import get_db
from models.user import User
from services.schemas import DashboardKPIs, KPICard
from utils.security import require_any_role

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/kpis", response_model=DashboardKPIs)
async def get_kpis(
    current_user: User = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    """Fetch all KPI metrics for the dashboard overview cards."""

    # Current month revenue
    rev_result = await db.execute(text("""
        SELECT
            COALESCE(SUM(CASE WHEN DATE_TRUNC('month', ordered_at) = DATE_TRUNC('month', NOW()) THEN total_amount END), 0) AS current_month,
            COALESCE(SUM(CASE WHEN DATE_TRUNC('month', ordered_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month') THEN total_amount END), 0) AS last_month
        FROM orders WHERE payment_status = 'paid'
    """))
    rev_row = rev_result.fetchone()
    current_rev = float(rev_row[0])
    last_rev = float(rev_row[1])
    rev_change = ((current_rev - last_rev) / last_rev * 100) if last_rev > 0 else 0

    # Orders this month vs last
    ord_result = await db.execute(text("""
        SELECT
            COUNT(CASE WHEN DATE_TRUNC('month', ordered_at) = DATE_TRUNC('month', NOW()) THEN 1 END) AS current_month,
            COUNT(CASE WHEN DATE_TRUNC('month', ordered_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month') THEN 1 END) AS last_month
        FROM orders WHERE status != 'cancelled'
    """))
    ord_row = ord_result.fetchone()
    current_orders = int(ord_row[0])
    last_orders = int(ord_row[1])
    ord_change = ((current_orders - last_orders) / last_orders * 100) if last_orders > 0 else 0

    # Active customers
    cust_result = await db.execute(text("""
        SELECT
            COUNT(DISTINCT CASE WHEN DATE_TRUNC('month', ordered_at) = DATE_TRUNC('month', NOW()) THEN customer_id END) AS current_month,
            COUNT(DISTINCT CASE WHEN DATE_TRUNC('month', ordered_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month') THEN customer_id END) AS last_month
        FROM orders
    """))
    cust_row = cust_result.fetchone()
    current_cust = int(cust_row[0])
    last_cust = int(cust_row[1])
    cust_change = ((current_cust - last_cust) / last_cust * 100) if last_cust > 0 else 0

    # Avg order value
    aov_result = await db.execute(text("""
        SELECT
            COALESCE(AVG(CASE WHEN DATE_TRUNC('month', ordered_at) = DATE_TRUNC('month', NOW()) THEN total_amount END), 0) AS current_month,
            COALESCE(AVG(CASE WHEN DATE_TRUNC('month', ordered_at) = DATE_TRUNC('month', NOW() - INTERVAL '1 month') THEN total_amount END), 0) AS last_month
        FROM orders WHERE payment_status = 'paid'
    """))
    aov_row = aov_result.fetchone()
    current_aov = float(aov_row[0])
    last_aov = float(aov_row[1])
    aov_change = ((current_aov - last_aov) / last_aov * 100) if last_aov > 0 else 0

    # YTD revenue growth vs last year
    ytd_result = await db.execute(text("""
        SELECT
            COALESCE(SUM(CASE WHEN DATE_PART('year', ordered_at) = DATE_PART('year', NOW()) THEN total_amount END), 0) AS ytd,
            COALESCE(SUM(CASE WHEN DATE_PART('year', ordered_at) = DATE_PART('year', NOW()) - 1 THEN total_amount END), 0) AS last_year
        FROM orders WHERE payment_status = 'paid'
    """))
    ytd_row = ytd_result.fetchone()
    ytd_rev = float(ytd_row[0])
    ly_rev = float(ytd_row[1])
    ytd_growth = ((ytd_rev - ly_rev) / ly_rev * 100) if ly_rev > 0 else 0

    # Top category
    cat_result = await db.execute(text("""
        SELECT p.category, ROUND(SUM(oi.line_total)::NUMERIC, 2) AS revenue
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        JOIN orders o ON o.id = oi.order_id
        WHERE o.payment_status = 'paid'
          AND DATE_TRUNC('month', o.ordered_at) = DATE_TRUNC('month', NOW())
        GROUP BY p.category
        ORDER BY revenue DESC
        LIMIT 1
    """))
    cat_row = cat_result.fetchone()
    top_category = cat_row[0] if cat_row else "N/A"

    def trend(change: float) -> str:
        if change > 0:
            return "up"
        if change < 0:
            return "down"
        return "neutral"

    return DashboardKPIs(
        total_revenue=KPICard(
            label="Revenue This Month",
            value=round(current_rev, 2),
            change_pct=round(rev_change, 1),
            trend=trend(rev_change),
            prefix="$",
        ),
        total_orders=KPICard(
            label="Orders This Month",
            value=current_orders,
            change_pct=round(ord_change, 1),
            trend=trend(ord_change),
        ),
        active_customers=KPICard(
            label="Active Customers",
            value=current_cust,
            change_pct=round(cust_change, 1),
            trend=trend(cust_change),
        ),
        avg_order_value=KPICard(
            label="Avg Order Value",
            value=round(current_aov, 2),
            change_pct=round(aov_change, 1),
            trend=trend(aov_change),
            prefix="$",
        ),
        revenue_growth=KPICard(
            label="YTD Growth",
            value=round(ytd_growth, 1),
            trend=trend(ytd_growth),
            suffix="%",
        ),
        top_category=KPICard(
            label="Top Category",
            value=top_category,
            trend="neutral",
        ),
    )


@router.get("/revenue-trend")
async def get_revenue_trend(
    current_user: User = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    """Monthly revenue + order count for the last 12 months."""
    result = await db.execute(text("""
        SELECT
            TO_CHAR(DATE_TRUNC('month', ordered_at), 'Mon YYYY') AS month,
            DATE_TRUNC('month', ordered_at) AS month_date,
            COUNT(DISTINCT id) AS orders,
            ROUND(SUM(total_amount)::NUMERIC, 2) AS revenue
        FROM orders
        WHERE payment_status = 'paid'
          AND ordered_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', ordered_at)
        ORDER BY month_date
    """))
    rows = result.fetchall()
    return [{"month": r[0], "orders": int(r[2]), "revenue": float(r[3])} for r in rows]


@router.get("/category-breakdown")
async def get_category_breakdown(
    current_user: User = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    """Product category revenue breakdown."""
    result = await db.execute(text("""
        SELECT
            p.category,
            COUNT(DISTINCT oi.order_id) AS orders,
            SUM(oi.quantity) AS units_sold,
            ROUND(SUM(oi.line_total)::NUMERIC, 2) AS revenue
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        JOIN orders o ON o.id = oi.order_id
        WHERE o.payment_status = 'paid'
        GROUP BY p.category
        ORDER BY revenue DESC
    """))
    rows = result.fetchall()
    return [
        {"category": r[0], "orders": int(r[1]), "units_sold": int(r[2]), "revenue": float(r[3])}
        for r in rows
    ]


@router.get("/top-customers")
async def get_top_customers(
    limit: int = 10,
    current_user: User = Depends(require_any_role),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(text(f"""
        SELECT
            c.id,
            c.first_name || ' ' || c.last_name AS name,
            c.email,
            c.company,
            c.country,
            ROUND(c.lifetime_value::NUMERIC, 2) AS lifetime_value,
            COUNT(DISTINCT o.id) AS order_count
        FROM customers c
        LEFT JOIN orders o ON o.customer_id = c.id AND o.payment_status = 'paid'
        GROUP BY c.id
        ORDER BY c.lifetime_value DESC
        LIMIT {min(limit, 50)}
    """))
    rows = result.fetchall()
    return [
        {
            "id": r[0], "name": r[1], "email": r[2],
            "company": r[3], "country": r[4],
            "lifetime_value": float(r[5]), "order_count": int(r[6]),
        }
        for r in rows
    ]
