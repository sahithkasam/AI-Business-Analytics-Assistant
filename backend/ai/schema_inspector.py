"""
Dynamically fetch database schema to build context-aware AI prompts.
"""
import logging
from functools import lru_cache

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

ANALYTICS_TABLES = [
    "customers", "products", "orders", "order_items",
    "employees", "departments", "payments",
]


async def get_schema_description(session: AsyncSession) -> str:
    """
    Fetch live schema from PostgreSQL and format it as a structured
    description for AI prompt injection.
    """
    schema_parts = []

    for table in ANALYTICS_TABLES:
        # Get columns with types and constraints
        col_query = text("""
            SELECT
                c.column_name,
                c.data_type,
                c.is_nullable,
                c.column_default,
                pgd.description AS column_comment
            FROM information_schema.columns c
            LEFT JOIN pg_catalog.pg_statio_all_tables st
                ON st.schemaname = c.table_schema AND st.relname = c.table_name
            LEFT JOIN pg_catalog.pg_description pgd
                ON pgd.objoid = st.relid AND pgd.objsubid = c.ordinal_position
            WHERE c.table_schema = 'public'
              AND c.table_name = :table
            ORDER BY c.ordinal_position;
        """)
        col_result = await session.execute(col_query, {"table": table})
        columns = col_result.fetchall()

        if not columns:
            continue

        # Get foreign keys
        fk_query = text("""
            SELECT
                kcu.column_name,
                ccu.table_name AS foreign_table,
                ccu.column_name AS foreign_column
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
              AND tc.table_name = :table;
        """)
        fk_result = await session.execute(fk_query, {"table": table})
        foreign_keys = {row[0]: (row[1], row[2]) for row in fk_result.fetchall()}

        # Get row count estimate
        count_query = text(f"SELECT COUNT(*) FROM {table};")  # nosec - table name is from whitelist
        count_result = await session.execute(count_query)
        row_count = count_result.scalar()

        # Format table info
        col_lines = []
        for col in columns:
            name, dtype, nullable, default, comment = col
            line = f"  - {name}: {dtype}"
            if nullable == "NO":
                line += " NOT NULL"
            if name in foreign_keys:
                ft, fc = foreign_keys[name]
                line += f" → {ft}.{fc}"
            col_lines.append(line)

        schema_parts.append(
            f"TABLE: {table} ({row_count:,} rows)\n" + "\n".join(col_lines)
        )

    # Add relationship summary
    relationships = """
RELATIONSHIPS:
  orders.customer_id → customers.id
  orders.employee_id → employees.id
  order_items.order_id → orders.id
  order_items.product_id → products.id
  payments.order_id → orders.id
  payments.customer_id → customers.id
  employees.department_id → departments.id
  employees.manager_id → employees.id
  departments.manager_id → employees.id

KEY BUSINESS RULES:
  - Revenue = orders.total_amount WHERE payment_status = 'paid'
  - Active records use is_active = TRUE
  - Order statuses: pending, processing, shipped, delivered, cancelled, refunded
  - Payment methods: credit_card, debit_card, paypal, bank_transfer, crypto, cash
"""

    return "\n\n".join(schema_parts) + "\n" + relationships
