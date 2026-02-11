"""API endpoints for candidate flow and health."""
import asyncpg
from fastapi import APIRouter, Request, Depends
from pydantic import BaseModel

from repositories import candidate_repo, job_repo

router = APIRouter()

# In-memory store for the job selected by the candidate (e.g. for this session/flow).
# Key: optional session_id, value: selected job payload. Use "" as default key when no session.
_candidate_selected_job: dict[str, dict] = {}


class SelectedJobPayload(BaseModel):
    job_id: str
    title: str | None = None
    location: str | None = None
    company_name: str | None = None
    branch_name: str | None = None
    job_description: str | None = None


class CVUrlPayload(BaseModel):
    """Payload carrying the public URL of an uploaded CV."""

    file_url: str


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


@router.post("/candidate/selected-job")
def set_candidate_selected_job(payload: SelectedJobPayload, session_id: str = ""):
    """Store the job selected by the candidate. Optional session_id for multi-session support."""
    key = session_id or "default"
    _candidate_selected_job[key] = payload.model_dump()
    print("[Candidate selected job]", payload.model_dump())
    # here we can get jd for cvjd model
    return {"ok": True, "job_id": payload.job_id}


@router.get("/candidate/selected-job")
def get_candidate_selected_job(session_id: str = ""):
    """Return the job currently stored as selected by the candidate, if any."""
    key = session_id or "default"
    data = _candidate_selected_job.get(key)
    if not data:
        return {"selected_job": None}
    return {"selected_job": data}


@router.post("/candidate/cv-url")
def receive_cv_url(payload: CVUrlPayload):
    """Receive the uploaded CV URL from the frontend and print it."""
    print("[Candidate CV URL]", payload.file_url)
    # In future you can store this in DB or trigger processing here
    return {"ok": True}
