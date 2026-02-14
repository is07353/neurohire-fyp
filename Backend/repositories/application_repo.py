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


async def get_ai_assessment_for_application(
    pool: asyncpg.Pool,
    application_id: int,
) -> dict | None:
    """Get full ai_assessments row for an application (for Candidate Review page)."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT
                assessment_id,
                application_id,
                cv_score,
                cv_recommendation,
                cv_matching_analysis,
                cv_reason_summary,
                cv_jd_output,
                video_score,
                total_score,
                confidence_score,
                clarity,
                answer_relevance,
                speech_analysis,
                speech_llm_output
            FROM ai_assessments
            WHERE application_id = $1;
            """,
            application_id,
        )
    return dict(row) if row else None


async def upsert_dummy_ai_assessment(
    pool: asyncpg.Pool,
    application_id: int,
) -> bool:
    """Insert or update ai_assessments with dummy data for an application. Returns True if row was inserted/updated."""
    dummy_cv_matching = (
        "Experience in logistics and warehouse work is relevant to delivery riding (40%)\n"
        "Lack of specific bike riding or delivery experience (30%)\n"
        "Strong physical fitness aligns well with delivery work requirements (30%)"
    )
    dummy_reason_summary = (
        "The candidate's warehouse experience provides a foundation for delivery work, "
        "demonstrating familiarity with inventory management and physical demands. "
        "While they lack specific bike riding skills, their logistics background and physical fitness "
        "indicate strong potential for success in the delivery rider role. "
        "The candidate's experience suggests they understand time-sensitive operations and customer service basics."
    )
    dummy_speech_analysis = (
        "The candidate demonstrates strong confidence when discussing their warehouse experience. "
        "Their communication style is clear and direct, though they occasionally struggle with articulation "
        "when connecting past roles to delivery work. Overall tone is professional and enthusiastic. "
        "Strengths include clarity of thought and positive attitude. Could improve on providing more specific examples."
    )
    async with pool.acquire() as conn:
        existing = await conn.fetchval(
            "SELECT assessment_id FROM ai_assessments WHERE application_id = $1;",
            application_id,
        )
        if existing:
            await conn.execute(
                """
                UPDATE ai_assessments SET
                    cv_score = $2,
                    cv_matching_analysis = $3,
                    cv_reason_summary = $4,
                    video_score = $5,
                    total_score = $6,
                    confidence_score = $7,
                    clarity = $8,
                    answer_relevance = $9,
                    speech_analysis = $10
                WHERE application_id = $1;
                """,
                application_id,
                76,
                dummy_cv_matching,
                dummy_reason_summary,
                82,
                79,
                85,
                78,
                88,
                dummy_speech_analysis,
            )
        else:
            await conn.execute(
                """
                INSERT INTO ai_assessments (
                    application_id,
                    cv_score,
                    cv_matching_analysis,
                    cv_reason_summary,
                    video_score,
                    total_score,
                    confidence_score,
                    clarity,
                    answer_relevance,
                    speech_analysis
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
                """,
                application_id,
                76,
                dummy_cv_matching,
                dummy_reason_summary,
                82,
                79,
                85,
                78,
                88,
                dummy_speech_analysis,
            )
    return True


async def seed_dummy_ai_assessments_for_all_applications(pool: asyncpg.Pool) -> dict:
    """Upsert dummy ai_assessments for every candidate_application so Candidate Review shows data. Returns count."""
    async with pool.acquire() as conn:
        app_ids = await conn.fetch(
            "SELECT application_id FROM candidate_applications ORDER BY application_id;"
        )
    count = 0
    for row in app_ids:
        await upsert_dummy_ai_assessment(pool, row["application_id"])
        count += 1
    return {"message": "Dummy AI assessments seeded", "count": count}


async def record_recruiter_decision(
    pool: asyncpg.Pool,
    application_id: int,
    decision: str,
) -> dict | None:
    """Record recruiter action: update candidate_applications.status and upsert recruiter_decisions.
    decision must be 'accept' | 'reject' | 'interview'. Returns application row or None if not found."""
    status_map = {
        "accept": "accepted",
        "reject": "rejected",
        "interview": "sent_to_interview",
    }
    if decision not in status_map:
        raise ValueError(f"Invalid decision: {decision}. Must be one of accept, reject, interview.")
    status_value = status_map[decision]
    final_decision = decision  # store as accept/reject/interview; or use status_value if you prefer

    async with pool.acquire() as conn:
        app_row = await conn.fetchrow(
            "SELECT application_id, job_id FROM candidate_applications WHERE application_id = $1;",
            application_id,
        )
        if not app_row:
            return None
        job_id = app_row["job_id"]
        recruiter_row = await conn.fetchrow(
            "SELECT recruiter_id FROM jobs WHERE job_id = $1;",
            job_id,
        )
        if not recruiter_row:
            return None
        recruiter_id = recruiter_row["recruiter_id"]

        await conn.execute(
            "UPDATE candidate_applications SET status = $2 WHERE application_id = $1;",
            application_id,
            status_value,
        )
        await conn.execute(
            """
            INSERT INTO recruiter_decisions (application_id, recruiter_id, final_decision, overrode_ai)
            VALUES ($1, $2, $3, false)
            ON CONFLICT (application_id) DO UPDATE SET
                recruiter_id = EXCLUDED.recruiter_id,
                final_decision = EXCLUDED.final_decision,
                decision_date = NOW();
            """,
            application_id,
            recruiter_id,
            final_decision,
        )
    return {"application_id": application_id, "status": status_value, "final_decision": final_decision}


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

