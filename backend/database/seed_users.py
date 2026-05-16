"""Seed demo users into the users table."""
import asyncio, sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from database.connection import AsyncSessionLocal, init_db, engine
from models.user import User, UserRole
from utils.security import hash_password
import models  # noqa


DEMO_USERS = [
    {"email": "admin@analytics.com",   "username": "admin",   "full_name": "System Administrator", "role": UserRole.ADMIN,   "password": "Admin@123"},
    {"email": "analyst@analytics.com", "username": "analyst", "full_name": "Data Analyst",          "role": UserRole.ANALYST, "password": "Admin@123"},
    {"email": "viewer@analytics.com",  "username": "viewer",  "full_name": "Report Viewer",         "role": UserRole.VIEWER,  "password": "Admin@123"},
]


async def seed():
    await init_db()
    async with AsyncSessionLocal() as db:
        for u in DEMO_USERS:
            result = await db.execute(select(User).where(User.email == u["email"]))
            if result.scalar_one_or_none():
                print(f"  already exists: {u['email']}")
                continue
            user = User(
                email=u["email"],
                username=u["username"],
                full_name=u["full_name"],
                role=u["role"],
                hashed_password=hash_password(u["password"]),
                is_active=True,
                is_verified=True,
            )
            db.add(user)
        await db.commit()
        print("Demo users seeded.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
