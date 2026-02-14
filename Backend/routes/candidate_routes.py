"""API endpoints for candidate flow and health."""
import asyncpg
from fastapi import APIRouter, Request, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel

from repositories import candidate_repo, job_repo, cv_repo, application_repo, video_repo
from cv_storage import download_and_save_cv
from video_storage import download_and_save_video

router = APIRouter()

# In-memory store for the job selected by the candidate (e.g. for this session/flow).
# Key: optional session_id, value: selected job payload. Use "" as default key when no session.
_candidate_selected_job: dict[str, dict] = {}

# Track the latest application_id created for this candidate flow so we can
# associate the video submission with the same application.
_latest_application_id: int | None = None


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
    file_size: int | None = None
    mime_type: str | None = None


class VideoUrlPayload(BaseModel):
    """Payload carrying the public URL of an uploaded interview video."""

    file_url: str
    file_key: str | None = None
    file_size: int | None = None
    mime_type: str | None = None
    question_index: int
    question_text: str


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


@router.get("/candidate/jobs/{job_id}/questions")
async def get_job_questions(job_id: str, pool: asyncpg.Pool = Depends(get_db_pool)):
    """Return video interview questions for the given job (from job_questions table). Used by candidate flow."""
    try:
        jid = int(job_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid job_id")
    job = await job_repo.get_job_by_id(pool, job_id=jid)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    # Only expose questions for open jobs
    if job.get("status") != "open":
        raise HTTPException(status_code=404, detail="Job not found")
    return {"questions": job.get("questions") or []}


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
async def receive_cv_url(
    payload: CVUrlPayload,
    pool: asyncpg.Pool = Depends(get_db_pool),
    background_tasks: BackgroundTasks = None,
):
    """
    Receive the uploaded CV URL from the frontend and:
    - create a minimal candidate row, and
    - store basic CV metadata in the cv_data table.

    This ensures there is at least one candidate record as soon as a CV is uploaded.
    """
    print("[Candidate CV URL]", payload.file_url)

    # Ensure we have a selected job (from the earlier step in the flow)
    selected = _candidate_selected_job.get("default")
    if not selected or not selected.get("job_id"):
        raise HTTPException(status_code=400, detail="No selected job for candidate CV upload")

    try:
        job_id = int(selected["job_id"])
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid job_id for candidate CV upload")

    # 1) Create a minimal candidate row (fields will be filled later from parsing / review form)
    candidate = await candidate_repo.create_candidate_minimal(pool)

    # 2) Create a candidate application for this candidate + job
    application = await application_repo.create_candidate_application(
        pool,
        candidate_id=candidate["candidate_id"],
        job_id=job_id,
    )

    # Remember the latest application_id for subsequent video upload
    global _latest_application_id
    _latest_application_id = application["application_id"]

    # 3) Store CV metadata, linked to the application_id (required, non-null FK)
    cv_record = await cv_repo.insert_cv_metadata(
        pool,
        application_id=application["application_id"],
        file_url=payload.file_url,
        file_size=payload.file_size,
        mime_type=payload.mime_type,
    )
    # 4) Kick off a background task to download and persist the actual CV file
    #    into Backend/cv_pdfs for OCR.
    if background_tasks is not None:
        background_tasks.add_task(
            download_and_save_cv,
            payload.file_url,
            application["application_id"],
        )

    return {
        "ok": True,
        "candidate": candidate,
        "application": application,
        "cv": cv_record,
    }


@router.post("/candidate/video-url")
async def receive_video_url(
    payload: VideoUrlPayload,
    pool: asyncpg.Pool = Depends(get_db_pool),
    background_tasks: BackgroundTasks = None,
):
    """
    Receive the uploaded video URL from the frontend and store metadata in
    video_submissions for the most recent application in this flow.

    We assume that the CV upload step has already created a candidate
    application and set _latest_application_id.
    """
    if _latest_application_id is None:
        raise HTTPException(
            status_code=400,
            detail="No application_id available for video upload (CV step must run first)",
        )

    application_id = _latest_application_id
    print(
        "[Candidate video URL]",
        {
            "application_id": application_id,
            "question_index": payload.question_index,
            "question_text": payload.question_text,
            "url": payload.file_url,
        },
    )

    video_record = await video_repo.upsert_video_metadata(
        pool,
        application_id=application_id,
        question_index=payload.question_index,
        question_text=payload.question_text,
        video_url=payload.file_url,
        video_file_key=payload.file_key,
        file_size=payload.file_size,
        mime_type=payload.mime_type,
    )

    # Download the actual video file in the background and store it locally
    # under Backend/videos_application for later analysis.
    if background_tasks is not None:
        background_tasks.add_task(
            download_and_save_video,
            payload.file_url,
            application_id,
            payload.question_index,
        )

    return {
        "ok": True,
        "application_id": application_id,
        "question_index": payload.question_index,
        "video": video_record,
    }
