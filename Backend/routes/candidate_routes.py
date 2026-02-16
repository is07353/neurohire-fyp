"""API endpoints for candidate flow and health."""
import asyncio
import json
import asyncpg
from fastapi import APIRouter, Request, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel

from repositories import candidate_repo, job_repo, cv_repo, application_repo, video_repo
from cv_storage import download_and_save_cv
from video_storage import download_and_save_video
from services.cv_analysis_client import run_cv_jd_analysis
from services.video_analysis_client import (
    run_video_full_pipeline,
    extract_video_metrics,
)

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


def _clean_extracted_value(v: str | None) -> str | None:
    """Treat 'Not provided' and similar as empty so we don't persist them."""
    if v is None:
        return None
    s = str(v).strip()
    if not s or s.lower() in ("not provided", "n/a", "na", "none"):
        return None
    return s


async def _download_and_analyze_cv(
    app,
    cv_url: str,
    application_id: int,
    candidate_id: int,
    job_description: str,
) -> None:
    """
    Background task: download CV, call Gradio CV+JD API, update candidate and cv_data.
    We always mark cv_data as processed at the end so the loading screen can exit.
    """
    pool = app.state.db_pool
    cv_text = ""
    parsed_keywords = ""
    technical_score = None
    assessment_payload = None
    try:
        try:
            path = download_and_save_cv(cv_url, application_id)
        except Exception as e:
            print(f"[cv_analysis] Failed to download CV for application_id={application_id}: {e}")
            return
        analysis = run_cv_jd_analysis(path, job_description or "")
        print(f"[cv_analysis] Model normalized analysis for application_id={application_id}: {analysis}")
        if analysis.get("error"):
            print(f"[cv_analysis] API error for application_id={application_id}: {analysis['error']}")
        name = _clean_extracted_value(analysis.get("name"))
        email = _clean_extracted_value(analysis.get("email"))
        phone = _clean_extracted_value(analysis.get("phone_number"))
        address = _clean_extracted_value(analysis.get("address"))
        cv_text = (analysis.get("description") or "").strip()
        matching = analysis.get("matching_analysis") or []
        parsed_keywords = json.dumps(matching) if isinstance(matching, list) else str(matching)
        technical_score = analysis.get("Total_score")
        # Build payload for ai_assessments so we can persist even if a later step fails
        cv_matching_str = "\n".join(str(x) for x in matching) if matching else None
        assessment_payload = {
            "cv_score": technical_score,
            "cv_recommendation": (analysis.get("recommendation") or "").strip() or None,
            "cv_matching_analysis": cv_matching_str,
            "cv_reason_summary": cv_text.strip() or None,
            "cv_jd_output": analysis,
        }
        await candidate_repo.update_candidate_from_extraction(
            pool,
            candidate_id,
            full_name=name or None,
            email=email or None,
            phone=phone or None,
            address=address or None,
        )
    except Exception as e:
        print(f"[cv_analysis] Error for application_id={application_id}: {e}")
    finally:
        # Always mark as processed so the loading screen exits
        if not cv_text and technical_score is None:
            cv_text = " "
        await cv_repo.update_cv_analysis(
            pool,
            application_id,
            cv_text=cv_text,
            parsed_keywords=parsed_keywords,
            technical_score=technical_score,
        )
        # Persist to ai_assessments even if something above failed (so CV fields are never left NULL)
        if assessment_payload is not None:
            try:
                await application_repo.upsert_cv_jd_assessment(
                    pool,
                    application_id,
                    **assessment_payload,
                )
                print(f"[cv_analysis] ai_assessments updated for application_id={application_id}")
            except Exception as e2:
                print(f"[cv_analysis] Failed to update ai_assessments for application_id={application_id}: {e2}")
        print(f"[cv_analysis] Updated candidate_id={candidate_id}, application_id={application_id} (score={technical_score})")


@router.get("/candidate/overview")
async def candidate_overview(pool: asyncpg.Pool = Depends(get_db_pool)):
    """Return extracted candidate info (name, phone, email, address) for the latest application in this flow."""
    app_id = _latest_application_id
    if not app_id:
        return {"name": "", "phone": "", "email": "", "address": ""}
    app_row = await application_repo.get_application_by_id(pool, app_id)
    if not app_row:
        return {"name": "", "phone": "", "email": "", "address": ""}
    candidate = await candidate_repo.get_candidate_by_id(pool, app_row["candidate_id"])
    if not candidate:
        return {"name": "", "phone": "", "email": "", "address": ""}
    return {
        "name": (candidate.get("full_name") or "").strip(),
        "phone": (candidate.get("phone") or "").strip(),
        "email": (candidate.get("email") or "").strip(),
        "address": (candidate.get("address") or "").strip(),
    }


class ReviewInfoPayload(BaseModel):
    """Payload from Review Your Information form (candidate confirms/edits extracted data)."""
    fullName: str = ""
    phone: str = ""
    email: str = ""
    address: str = ""


@router.post("/candidate/review")
async def candidate_review(
    payload: ReviewInfoPayload,
    pool: asyncpg.Pool = Depends(get_db_pool),
):
    """Save the candidate's reviewed/edited info to the candidates table. Uses latest application in this flow."""
    app_id = _latest_application_id
    if not app_id:
        raise HTTPException(status_code=400, detail="No application in this flow. Upload a CV first.")
    app_row = await application_repo.get_application_by_id(pool, app_id)
    if not app_row:
        raise HTTPException(status_code=404, detail="Application not found.")
    candidate_id = app_row["candidate_id"]
    await candidate_repo.update_candidate_review(
        pool,
        candidate_id,
        full_name=payload.fullName,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
    )
    return {"ok": True}


@router.get("/candidate/analysis-status")
async def candidate_analysis_status(pool: asyncpg.Pool = Depends(get_db_pool)):
    """
    Return whether CV+JD analysis is still pending for the latest application.
    Used by the processing screen to wait until the API has responded.
    On DB timeout or error we return pending=False so the loading screen can exit.
    """
    app_id = _latest_application_id
    if not app_id:
        return {"pending": False}
    try:
        pending = not await asyncio.wait_for(
            cv_repo.is_analysis_complete_for_application(pool, app_id),
            timeout=10.0,
        )
    except (asyncio.TimeoutError, Exception) as e:
        print(f"[cv_analysis] analysis-status error for app_id={app_id}: {e}")
        pending = False
    return {"pending": pending}


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
    request: Request,
    payload: CVUrlPayload,
    pool: asyncpg.Pool = Depends(get_db_pool),
    background_tasks: BackgroundTasks = None,
):
    """
    Receive the uploaded CV URL from the frontend and:
    - create a minimal candidate row, and
    - store basic CV metadata in the cv_data table.
    - in background: download CV, call CV+JD analysis API, update candidate and cv_data.
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

    job_description = (selected.get("job_description") or "").strip()

    # 1) Create a minimal candidate row (fields will be filled later from parsing / review form)
    candidate = await candidate_repo.create_candidate_minimal(pool)

    # 2) Create a candidate application for this candidate + job
    application = await application_repo.create_candidate_application(
        pool,
        candidate_id=candidate["candidate_id"],
        job_id=job_id,
    )

    # Create ai_assessments row so it exists and can be filled by CV+JD and video analysis
    await application_repo.insert_empty_ai_assessment(pool, application["application_id"])

    # Remember the latest application_id for subsequent video upload and overview
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
    # 4) Background: download CV, run Gradio CV+JD analysis, update candidate + cv_data
    if background_tasks is not None:
        background_tasks.add_task(
            _download_and_analyze_cv,
            request.app,
            payload.file_url,
            application["application_id"],
            candidate["candidate_id"],
            job_description,
        )

    return {
        "ok": True,
        "candidate": candidate,
        "application": application,
        "cv": cv_record,
    }


async def _analyze_video_and_update_db(
    app,
    *,
    application_id: int,
    question_index: int,
    question_text: str,
    video_url: str,
) -> None:
    """
    Background task:
    - download video file
    - call Gradio video pipeline
    - update ai_assessments, candidate_applications.tag_needs_review,
      and per-question metrics in video_submissions.
    """
    pool = app.state.db_pool
    try:
        path = download_and_save_video(video_url, application_id, question_index)
    except Exception as e:
        print(
            "[video_analysis] Failed to download video",
            {"application_id": application_id, "question_index": question_index, "error": str(e)},
        )
        return

    # Get job title / role for this application (may be used by the model as "role").
    role = ""
    try:
        app_row = await application_repo.get_application_by_id(pool, application_id)
        if app_row:
            job_row = await job_repo.get_job_by_id(pool, app_row["job_id"])
            if job_row:
                role = job_row.get("title") or job_row.get("job_title") or ""
    except Exception as e:
        print(f"[video_analysis] Failed to fetch job role for application_id={application_id}: {e}")

    analysis_raw = run_video_full_pipeline(path, role=role, question=question_text)
    print(
        "[video_analysis] Normalized analysis",
        {"application_id": application_id, "question_index": question_index, "analysis": analysis_raw},
    )

    metrics = extract_video_metrics(analysis_raw)

    # Update per-question metrics in video_submissions
    try:
        await video_repo.update_video_analysis_fields(
            pool,
            application_id=application_id,
            question_index=question_index,
            audio_transcript=metrics.get("transcript"),
            face_presence_ratio=metrics.get("face_presence_ratio"),
            camera_engagement_Ratio=metrics.get("camera_engagement_Ratio"),
            yaw_variance=metrics.get("yaw_variance"),
        )
    except Exception as e:
        print(
            "[video_analysis] Failed to update video_submissions",
            {"application_id": application_id, "question_index": question_index, "error": str(e)},
        )

    # Update ai_assessments + tag_needs_review at application level
    try:
        await application_repo.upsert_speech_assessment_and_tag(
            pool,
            application_id,
            confidence_score=metrics.get("visual_confidence_score"),
            clarity=metrics.get("clarity"),
            answer_relevance=metrics.get("relevance"),
            speech_analysis=metrics.get("summary"),
            speech_llm_output=analysis_raw,
            tag_needs_review=metrics.get("needs_review", False),
        )
    except Exception as e:
        print(
            "[video_analysis] Failed to update ai_assessments / candidate_applications",
            {"application_id": application_id, "error": str(e)},
        )


@router.post("/candidate/video-url")
async def receive_video_url(
    request: Request,
    payload: VideoUrlPayload,
    pool: asyncpg.Pool = Depends(get_db_pool),
    background_tasks: BackgroundTasks = None,
):
    """
    Receive the uploaded video URL from the frontend and store metadata in
    video_submissions for the most recent application in this flow.

    We assume that the CV upload step has already created a candidate
    application and set _latest_application_id. In the background we also:
    - download the video file
    - send it to the Gradio video+speech pipeline
    - update ai_assessments + candidate_applications + video_submissions with analysis fields.
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

    if background_tasks is not None:
        background_tasks.add_task(
            _analyze_video_and_update_db,
            request.app,
            application_id=application_id,
            question_index=payload.question_index,
            question_text=payload.question_text,
            video_url=payload.file_url,
        )

    return {
        "ok": True,
        "application_id": application_id,
        "question_index": payload.question_index,
        "video": video_record,
    }

