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

