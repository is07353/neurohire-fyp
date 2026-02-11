"""API endpoints for candidate flow and health."""
import asyncpg
from fastapi import APIRouter, Request, Depends

from repositories import candidate_repo, job_repo

router = APIRouter()


async def get_db_pool(request: Request) -> asyncpg.Pool:
    return request.app.state.db_pool


@router.get("/db-health")
async def db_health(pool: asyncpg.Pool = Depends(get_db_pool)):
    """Verify backend can talk to Neon."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT 1 AS ok;")
    return {"ok": row["ok"]}


@router.get("/test/candidates")
async def list_test_candidates(pool: asyncpg.Pool = Depends(get_db_pool)):
    """Read a few rows from candidates (no writes)."""
    return await candidate_repo.list_candidates(pool, limit=5)


@router.post("/test/candidates")
async def create_test_candidate(pool: asyncpg.Pool = Depends(get_db_pool)):
    """Insert one test candidate and return it."""
    return await candidate_repo.create_test_candidate(pool)


@router.get("/candidate/jobs")
async def list_candidate_jobs(pool: asyncpg.Pool = Depends(get_db_pool)):
    """List all open jobs for the candidate job-selection screen."""
    return await job_repo.list_open_jobs(pool)


@router.get("/candidate/overview")
def candidate_overview():
    """Placeholder candidate overview (e.g. from CV)."""
    return {
        "name": "Ali Khan",
        "phone": "03001234567",
        "email": "ali@example.com",
        "address": "Karachi, Pakistan",
    }
