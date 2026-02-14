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
    """Create and return the Neon Postgres connection pool with tuning for faster response."""
    return await asyncpg.create_pool(
        DATABASE_URL,
        min_size=1,  # Keep one connection warm so first request isn't slow
        max_size=10,
        command_timeout=15,  # Fail fast instead of hanging on slow DB
    )
