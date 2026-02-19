"""DB queries for candidate_applications."""
import json
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
            RETURNING application_id, candidate_id, job_id, status, created_at;
            """,
            candidate_id,
            job_id,
        )

    return dict(row)


async def get_application_by_id(
    pool: asyncpg.Pool,
    application_id: int,
) -> dict | None:
    """Get application by id (for candidate overview / linking to candidate)."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT application_id, candidate_id, job_id, status, created_at
            FROM candidate_applications
            WHERE application_id = $1;
            """,
            application_id,
        )
    return dict(row) if row else None


async def list_applications_for_job(
    pool: asyncpg.Pool,
    job_id: int,
) -> list[dict]:
    """List all applications for a job with candidate name, ai_assessments (cv_score), and video analysis progress."""
    async with pool.acquire() as conn:
        # Total video questions for this job (for progress denominator)
        total_questions_row = await conn.fetchrow(
            "SELECT COUNT(*) AS cnt FROM job_questions WHERE job_id = $1;",
            job_id,
        )
        total_questions = total_questions_row["cnt"] or 0

        rows = await conn.fetch(
            """
            SELECT
                ca.application_id,
                ca.candidate_id,
                ca.job_id,
                ca.status,
                COALESCE(c.full_name, 'Applicant') AS candidate_name,
                c.email AS candidate_email,
                c.phone AS candidate_phone,
                c.address AS candidate_address,
                aa.cv_score,
                (SELECT COUNT(*) FROM video_submissions vs
                 WHERE vs.application_id = ca.application_id AND vs.video_score IS NOT NULL) AS analyzed_count
            FROM candidate_applications ca
            LEFT JOIN candidates c ON c.candidate_id = ca.candidate_id
            LEFT JOIN ai_assessments aa ON aa.application_id = ca.application_id
            WHERE ca.job_id = $1
            ORDER BY ca.application_id;
            """,
            job_id,
        )

    def _progress(analyzed: int) -> tuple[int, bool]:
        if total_questions == 0:
            return 100, True  # No video questions => consider complete
        pct = min(100, round(analyzed / total_questions * 100))
        return pct, pct >= 100

    return [
        {
            "application_id": r["application_id"],
            "candidate_id": r["candidate_id"],
            "job_id": r["job_id"],
            "status": r["status"],
            "candidate_name": r["candidate_name"] or "Applicant",
            "candidate_email": r.get("candidate_email"),
            "candidate_phone": r.get("candidate_phone"),
            "candidate_address": r.get("candidate_address"),
            "cv_score": r["cv_score"],
            "video_score": None,
            "total_score": None,
            "analysis_progress": (p := _progress(r.get("analyzed_count") or 0))[0],
            "analysis_complete": p[1],
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
                cv_jd_output
            FROM ai_assessments
            WHERE application_id = $1;
            """,
            application_id,
        )
    return dict(row) if row else None


async def insert_empty_ai_assessment(
    pool: asyncpg.Pool,
    application_id: int,
) -> None:
    """Insert one ai_assessments row for an application (all fields NULL). Filled later by CV+JD and video analysis."""
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO ai_assessments (application_id)
            VALUES ($1)
            ON CONFLICT (application_id) DO NOTHING;
            """,
            application_id,
        )


async def upsert_cv_jd_assessment(
    pool: asyncpg.Pool,
    application_id: int,
    *,
    cv_score: int | None = None,
    cv_recommendation: str | None = None,
    cv_matching_analysis: str | None = None,
    cv_reason_summary: str | None = None,
    cv_jd_output: dict | None = None,
) -> None:
    """Update ai_assessments with CV+JD model output. Inserts a row if none exists."""
    # Serialize dict to JSON string for jsonb column (avoids driver/serialization issues)
    cv_jd_output_json = json.dumps(cv_jd_output) if cv_jd_output is not None else None
    async with pool.acquire() as conn:
        existing = await conn.fetchval(
            "SELECT assessment_id FROM ai_assessments WHERE application_id = $1;",
            application_id,
        )
        if not existing:
            await conn.execute(
                "INSERT INTO ai_assessments (application_id) VALUES ($1);",
                application_id,
            )

        await conn.execute(
            """
            UPDATE ai_assessments SET
                cv_score = $2,
                cv_recommendation = $3,
                cv_matching_analysis = $4,
                cv_reason_summary = $5,
                cv_jd_output = $6::jsonb
            WHERE application_id = $1;
            """,
            application_id,
            cv_score,
            cv_recommendation,
            cv_matching_analysis,
            cv_reason_summary,
            cv_jd_output_json,
        )


async def upsert_speech_assessment_and_tag(
    pool: asyncpg.Pool,
    application_id: int,
    *,
    confidence_score: int | None,
    clarity: int | None,
    answer_relevance: int | None,
    speech_analysis: str | None,
    speech_llm_output: dict | None,
    tag_needs_review: bool,
) -> None:
    """
    Legacy hook: previously updated ai_assessments speech fields and tag_needs_review.
    Speech/video metrics are now stored per-question in video_submissions and tag_needs_review has been removed.
    This function is kept as a no-op for backward compatibility with existing call sites.
    """
    async with pool.acquire() as conn:
        existing = await conn.fetchval(
            "SELECT assessment_id FROM ai_assessments WHERE application_id = $1;",
            application_id,
        )
        if not existing:
            await conn.execute(
                "INSERT INTO ai_assessments (application_id) VALUES ($1);",
                application_id,
            )


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
                    cv_reason_summary = $4
                WHERE application_id = $1;
                """,
                application_id,
                76,
                dummy_cv_matching,
                dummy_reason_summary,
            )
        else:
            await conn.execute(
                """
                INSERT INTO ai_assessments (
                    application_id,
                    cv_score,
                    cv_matching_analysis,
                    cv_reason_summary
                ) VALUES ($1, $2, $3, $4);
                """,
                application_id,
                76,
                dummy_cv_matching,
                dummy_reason_summary,
            )
    return True


async def ensure_ai_assessments_for_all_applications(pool: asyncpg.Pool) -> int:
    """Insert empty ai_assessments row for any application that does not have one. Returns number inserted."""
    async with pool.acquire() as conn:
        result = await conn.execute(
            """
            INSERT INTO ai_assessments (application_id)
            SELECT application_id FROM candidate_applications ca
            WHERE NOT EXISTS (SELECT 1 FROM ai_assessments aa WHERE aa.application_id = ca.application_id);
            """
        )
    # result is like "INSERT 0 5"; return the number
    return int(result.split()[-1]) if result and result.split()[-1].isdigit() else 0


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


async def get_recruiter_analytics(pool: asyncpg.Pool, recruiter_id: int) -> dict:
    """Analytics for recruiter overview: total applicants, AI buckets, shortlisted, monthly applications."""
    async with pool.acquire() as conn:
        # Total applicants and buckets by cv_score (from ai_assessments)
        row = await conn.fetchrow(
            """
            SELECT
                COUNT(*) AS total_applicants,
                COUNT(*) FILTER (WHERE ca.status IN ('accepted', 'sent_to_interview')) AS shortlisted,
                COUNT(*) FILTER (WHERE COALESCE(aa.cv_score, -1) >= 85) AS strong_fit,
                COUNT(*) FILTER (WHERE COALESCE(aa.cv_score, -1) >= 75 AND COALESCE(aa.cv_score, -1) < 85) AS good_fit,
                COUNT(*) FILTER (WHERE COALESCE(aa.cv_score, -1) >= 65 AND COALESCE(aa.cv_score, -1) < 75) AS needs_review,
                COUNT(*) FILTER (WHERE COALESCE(aa.cv_score, -1) < 65 OR aa.cv_score IS NULL) AS low_fit
            FROM candidate_applications ca
            INNER JOIN jobs j ON j.job_id = ca.job_id
            LEFT JOIN ai_assessments aa ON aa.application_id = ca.application_id
            WHERE j.recruiter_id = $1;
            """,
            recruiter_id,
        )
        if not row:
            return _empty_recruiter_analytics()

        total_applicants = row["total_applicants"] or 0
        shortlisted = row["shortlisted"] or 0
        strong_fit = row["strong_fit"] or 0
        good_fit = row["good_fit"] or 0
        needs_review = row["needs_review"] or 0
        low_fit = row["low_fit"] or 0
        recommended_by_ai = strong_fit + good_fit

        # Monthly applications (last 12 months by created_at)
        monthly = await conn.fetch(
            """
            SELECT
                date_trunc('month', ca.created_at)::date AS month_start,
                COUNT(*)::int AS applications
            FROM candidate_applications ca
            INNER JOIN jobs j ON j.job_id = ca.job_id
            WHERE j.recruiter_id = $1
            GROUP BY date_trunc('month', ca.created_at)
            ORDER BY month_start DESC
            LIMIT 12;
            """,
            recruiter_id,
        )
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_trends = []
    for r in reversed(list(monthly)):
        dt = r.get("month_start")
        if dt and hasattr(dt, "month"):
            label = month_names[dt.month - 1]
        else:
            label = "?"
        monthly_trends.append({"month": label, "applications": r.get("applications") or 0})

    return {
        "total_applicants": total_applicants,
        "recommended_by_ai": recommended_by_ai,
        "needs_review": needs_review,
        "shortlisted": shortlisted,
        "ai_recommendation_distribution": [
            {"name": "Strong Fit", "value": strong_fit, "color": "#10b981"},
            {"name": "Good Fit", "value": good_fit, "color": "#3b82f6"},
            {"name": "Needs Review", "value": needs_review, "color": "#f59e0b"},
            {"name": "Low Fit", "value": low_fit, "color": "#ef4444"},
        ],
        "monthly_applications": monthly_trends,
    }


def _empty_recruiter_analytics() -> dict:
    return {
        "total_applicants": 0,
        "recommended_by_ai": 0,
        "needs_review": 0,
        "shortlisted": 0,
        "ai_recommendation_distribution": [
            {"name": "Strong Fit", "value": 0, "color": "#10b981"},
            {"name": "Good Fit", "value": 0, "color": "#3b82f6"},
            {"name": "Needs Review", "value": 0, "color": "#f59e0b"},
            {"name": "Low Fit", "value": 0, "color": "#ef4444"},
        ],
        "monthly_applications": [],
    }

