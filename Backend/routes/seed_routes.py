"""API endpoints for seeding and one-off DB updates."""
import asyncpg
from fastapi import APIRouter, Request, Depends

from repositories import job_repo, application_repo

router = APIRouter(prefix="/seed", tags=["seed"])


async def get_db_pool(request: Request) -> asyncpg.Pool:
    return request.app.state.db_pool


@router.post("/jobs")
async def seed_jobs(pool: asyncpg.Pool = Depends(get_db_pool)):
    """Idempotent seed: one recruiter + sample open jobs if none exist."""
    return await job_repo.seed_jobs(pool)


@router.post("/update-jobs-company-branch")
async def update_jobs_company_branch(pool: asyncpg.Pool = Depends(get_db_pool)):
    """Backfill company_name and branch_name for existing jobs with empty values."""
    updated = await job_repo.update_jobs_company_branch(pool)
    return {"message": "Company and branch names updated", "updated": updated}


@router.post("/set-one-job-weightage-75-25")
async def set_one_job_weightage_75_25(pool: asyncpg.Pool = Depends(get_db_pool)):
    """Set the first job to 75% CV / 25% Video (for testing)."""
    row = await job_repo.set_one_job_weightage_75_25(pool)
    if not row:
        return {"message": "No jobs found to update"}
    return {
        "message": "Updated one job to 75% CV / 25% Video",
        "job": row,
    }


@router.post("/ai-assessments-ensure")
async def ensure_ai_assessments(pool: asyncpg.Pool = Depends(get_db_pool)):
    """Insert empty ai_assessments row for every application that has none. Run once to backfill the table."""
    inserted = await application_repo.ensure_ai_assessments_for_all_applications(pool)
    return {"message": "ai_assessments rows ensured", "inserted": inserted}


@router.post("/ai-assessments-dummy")
async def seed_ai_assessments_dummy(pool: asyncpg.Pool = Depends(get_db_pool)):
    """Insert dummy ai_assessments for every candidate_application that has none. Use so Candidate Review shows real DB data."""
    return await application_repo.seed_dummy_ai_assessments_for_all_applications(pool)
