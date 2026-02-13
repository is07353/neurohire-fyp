"""DB queries for candidate_applications."""
import asyncpg


async def create_candidate_application(
    pool: asyncpg.Pool,
    *,
    candidate_id: int,
    job_id: int,
) -> dict:
    """Create a candidate application row for the given candidate and job."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO candidate_applications (candidate_id, job_id)
            VALUES ($1, $2)
            RETURNING application_id, candidate_id, job_id, status, tag_needs_review, created_at;
            """,
            candidate_id,
            job_id,
        )

    return dict(row)


async def list_applications_for_job(
    pool: asyncpg.Pool,
    job_id: int,
) -> list[dict]:
    """List all applications for a job with candidate name and ai_assessments (cv_score, video_score, total_score)."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                ca.application_id,
                ca.candidate_id,
                ca.job_id,
                ca.status,
                COALESCE(c.full_name, 'Applicant') AS candidate_name,
                aa.cv_score,
                aa.video_score,
                aa.total_score
            FROM candidate_applications ca
            LEFT JOIN candidates c ON c.candidate_id = ca.candidate_id
            LEFT JOIN ai_assessments aa ON aa.application_id = ca.application_id
            WHERE ca.job_id = $1
            ORDER BY ca.application_id;
            """,
            job_id,
        )
    return [
        {
            "application_id": r["application_id"],
            "candidate_id": r["candidate_id"],
            "job_id": r["job_id"],
            "status": r["status"],
            "candidate_name": r["candidate_name"] or "Applicant",
            "cv_score": r["cv_score"],
            "video_score": r["video_score"],
            "total_score": r["total_score"],
        }
        for r in rows
    ]


async def count_applications_by_job(pool: asyncpg.Pool, job_ids: list[int]) -> dict[int, int]:
    """Return mapping of job_id -> applicant count for the given job IDs."""
    if not job_ids:
        return {}
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT job_id, COUNT(*) AS cnt
            FROM candidate_applications
            WHERE job_id = ANY($1::int[])
            GROUP BY job_id;
            """,
            job_ids,
        )
    return {r["job_id"]: r["cnt"] for r in rows}

