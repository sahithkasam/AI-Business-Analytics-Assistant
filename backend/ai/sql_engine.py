"""
Core AI text-to-SQL engine with automatic error correction.
"""
import asyncio
import logging
import re
import time
from typing import Any

from openai import AsyncOpenAI

from config.settings import settings
from .prompts import (
    build_sql_prompt,
    build_explanation_prompt,
    build_insight_prompt,
    build_correction_prompt,
    build_chart_prompt,
)

logger = logging.getLogger(__name__)

client = AsyncOpenAI(
    api_key=settings.GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1",
)

# Blocked SQL patterns (defense-in-depth on top of validation layer)
BLOCKED_PATTERNS = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|EXEC|EXECUTE|CALL|COPY|VACUUM|ANALYZE)\b",
    re.IGNORECASE,
)

ALLOWED_TABLES = {
    "customers", "products", "orders", "order_items",
    "employees", "departments", "payments",
}


class SQLGenerationError(Exception):
    pass


class SQLSafetyError(Exception):
    pass


def validate_sql(sql: str) -> str:
    """Validate SQL for safety. Returns cleaned SQL or raises SQLSafetyError."""
    sql = sql.strip().rstrip(";")

    # Must start with SELECT or WITH (CTE)
    first_token = sql.split()[0].upper()
    if first_token not in ("SELECT", "WITH"):
        raise SQLSafetyError(f"Only SELECT queries are allowed. Got: {first_token}")

    # Block dangerous keywords
    if BLOCKED_PATTERNS.search(sql):
        match = BLOCKED_PATTERNS.search(sql)
        raise SQLSafetyError(f"Query contains blocked keyword: {match.group()}")

    # Block multiple statements (semicolons in middle)
    if ";" in sql:
        raise SQLSafetyError("Multiple SQL statements are not allowed.")

    # Block comments that could hide injections
    if "--" in sql or "/*" in sql:
        raise SQLSafetyError("SQL comments are not allowed in queries.")

    # Block system table access
    system_tables = {"pg_", "information_schema", "sys.", "mysql.", "users", "user_"}
    lower_sql = sql.lower()
    for blocked in system_tables:
        # Allow legitimate 'users' table via app-level filtering; block pg_ system tables
        if f"from {blocked}" in lower_sql or f"join {blocked}" in lower_sql:
            if blocked in ("pg_", "information_schema", "sys.", "mysql."):
                raise SQLSafetyError(f"Access to system tables is not allowed: {blocked}")

    return sql


async def call_groq(messages: list[dict], temperature: float = 0.1, max_tokens: int = 2048) -> str:
    """Call Groq API with retry logic."""
    for attempt in range(3):
        try:
            response = await client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            if attempt == 2:
                raise
            logger.warning(f"OpenAI call attempt {attempt + 1} failed: {e}")
            await asyncio.sleep(2 ** attempt)
    return ""


class TextToSQLEngine:
    """
    Full AI pipeline: natural language → SQL → execution → insights.
    """

    def __init__(self, db_executor):
        self.db_executor = db_executor

    async def process_query(
        self,
        natural_query: str,
        schema: str,
        user_id: str = None,
        stream_callback=None,
    ) -> dict[str, Any]:
        """
        Full pipeline:
        1. Generate SQL from natural language
        2. Validate SQL safety
        3. Execute SQL
        4. Auto-correct on failure (up to 2 retries)
        5. Generate explanation + insights + chart recommendation
        """
        start_time = time.time()
        result = {
            "natural_query": natural_query,
            "generated_sql": None,
            "corrected_sql": None,
            "sql_explanation": None,
            "data": [],
            "columns": [],
            "row_count": 0,
            "chart_type": "table",
            "insights": None,
            "execution_time_ms": 0,
            "retry_count": 0,
            "status": "pending",
            "error": None,
        }

        # Step 1: Generate SQL
        if stream_callback:
            await stream_callback("Generating SQL from your question...")

        try:
            sql_messages = build_sql_prompt(natural_query, schema)
            raw_sql = await call_groq(sql_messages, temperature=0.1)
            # Strip markdown code fences if model adds them
            raw_sql = re.sub(r"```(?:sql)?\n?", "", raw_sql).strip()
            result["generated_sql"] = raw_sql
        except Exception as e:
            result["status"] = "failed"
            result["error"] = f"SQL generation failed: {str(e)}"
            return result

        # Step 2: Validate
        try:
            safe_sql = validate_sql(raw_sql)
        except SQLSafetyError as e:
            result["status"] = "failed"
            result["error"] = str(e)
            return result

        # Step 3: Execute with auto-correction
        current_sql = safe_sql
        execution_error = None

        for attempt in range(3):
            try:
                if stream_callback:
                    action = "Executing query..." if attempt == 0 else f"Retrying corrected query (attempt {attempt})..."
                    await stream_callback(action)

                exec_result = await self.db_executor(current_sql)
                result["data"] = exec_result["data"]
                result["columns"] = exec_result["columns"]
                result["row_count"] = len(exec_result["data"])
                if attempt > 0:
                    result["corrected_sql"] = current_sql
                    result["retry_count"] = attempt
                execution_error = None
                result["status"] = "success"
                break

            except Exception as e:
                execution_error = str(e)
                logger.warning(f"SQL execution attempt {attempt + 1} failed: {execution_error}")

                if attempt < 2:
                    # Auto-correct
                    if stream_callback:
                        await stream_callback(f"Query failed, asking AI to correct it...")
                    try:
                        correction_msgs = build_correction_prompt(current_sql, execution_error, schema)
                        corrected = await call_groq(correction_msgs, temperature=0.0)
                        corrected = re.sub(r"```(?:sql)?\n?", "", corrected).strip()
                        current_sql = validate_sql(corrected)
                    except Exception as ce:
                        logger.error(f"SQL correction failed: {ce}")
                        break

        if execution_error and result["status"] != "success":
            result["status"] = "failed"
            result["error"] = execution_error
            result["execution_time_ms"] = int((time.time() - start_time) * 1000)
            return result

        # Step 4: Explain SQL
        if stream_callback:
            await stream_callback("Generating explanation...")
        try:
            exp_messages = build_explanation_prompt(current_sql)
            result["sql_explanation"] = await call_groq(exp_messages, temperature=0.3, max_tokens=256)
        except Exception as e:
            logger.warning(f"Explanation generation failed: {e}")

        # Step 5: Chart recommendation
        try:
            if result["columns"]:
                chart_msgs = build_chart_prompt(result["columns"])
                chart_type = await call_groq(chart_msgs, temperature=0.0, max_tokens=10)
                chart_type = chart_type.strip().lower().strip('"').strip("'")
                if chart_type in ("line", "bar", "pie", "area", "scatter", "table"):
                    result["chart_type"] = chart_type
        except Exception as e:
            logger.warning(f"Chart recommendation failed: {e}")

        # Step 6: Business insights
        if result["data"] and stream_callback:
            await stream_callback("Generating business insights...")
        try:
            if result["data"]:
                col_names = [c["name"] for c in result["columns"]]
                insight_msgs = build_insight_prompt(natural_query, col_names, result["data"])
                result["insights"] = await call_groq(insight_msgs, temperature=0.5, max_tokens=512)
        except Exception as e:
            logger.warning(f"Insight generation failed: {e}")

        result["execution_time_ms"] = int((time.time() - start_time) * 1000)
        return result
