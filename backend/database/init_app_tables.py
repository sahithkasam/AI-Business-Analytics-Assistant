"""
Initialize app-level tables (users, query_history, etc.) that aren't in schema.sql.
Run this after the DB is started: python database/init_app_tables.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import init_db, engine
import models  # noqa: F401 — registers all ORM models


async def main():
    print("Creating application tables...")
    await init_db()
    await engine.dispose()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
