"""
DB connection and pool. Load env and expose pool creation for app startup.
"""
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")


async def create_pool() -> asyncpg.Pool:
    """Create and return the Neon Postgres connection pool."""
    return await asyncpg.create_pool(DATABASE_URL)
