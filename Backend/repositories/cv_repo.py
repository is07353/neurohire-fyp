"""DB operations for CV metadata (cv_data table)."""
import asyncpg


async def insert_cv_metadata(
    pool: asyncpg.Pool,
    *,
    application_id: int,
    file_url: str,
    file_size: int | None,
    mime_type: str | None,
) -> dict:
    """Insert a new row into cv_data with the uploaded CV URL and basic metadata."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO cv_data (
                application_id,
                cv_text,
                parsed_keywords,
                cv_url,
                file_size,
                mime_type
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING cv_id, application_id, cv_url, file_size, mime_type;
            """,
            application_id,
            "",
            "",
            file_url,
            file_size,
            mime_type,
        )

    return dict(row)


async def get_cv_for_application(pool: asyncpg.Pool, application_id: int) -> dict | None:
    """Get CV URL and metadata for an application (for Candidate Review preview/download)."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT cv_url, mime_type
            FROM cv_data
            WHERE application_id = $1;
            """,
            application_id,
        )
    return dict(row) if row and row.get("cv_url") else None


async def update_cv_analysis(
    pool: asyncpg.Pool,
    application_id: int,
    *,
    cv_text: str = "",
    parsed_keywords: str = "",
    technical_score: int | None = None,
) -> None:
    """Update cv_data with analysis from the CV+JD model (description, matching_analysis, score)."""
    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE cv_data
            SET cv_text = $2, parsed_keywords = $3, technical_score = $4
            WHERE application_id = $1;
            """,
            application_id,
            cv_text or "",
            parsed_keywords or "",
            technical_score,
        )


async def is_analysis_complete_for_application(
    pool: asyncpg.Pool,
    application_id: int,
) -> bool:
    """True if cv_data has analysis (score or non-empty cv_text) or candidate has extracted name, or row is old enough (fallback)."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT d.technical_score, d.cv_text, c.full_name, d.uploaded_at
            FROM cv_data d
            JOIN candidate_applications a ON a.application_id = d.application_id
            JOIN candidates c ON c.candidate_id = a.candidate_id
            WHERE d.application_id = $1;
            """,
            application_id,
        )
    if not row:
        return False
    cv_text = (row["cv_text"] or "").strip()
    has_score = row["technical_score"] is not None
    has_text = cv_text != ""
    has_name = (row["full_name"] or "").strip() != ""
    # Fallback: if cv_data row is older than 45s, consider complete so loading screen never sticks
    from datetime import datetime, timezone
    uploaded_at = row["uploaded_at"]
    if uploaded_at:
        now = datetime.now(timezone.utc)
        up = uploaded_at if uploaded_at.tzinfo else uploaded_at.replace(tzinfo=timezone.utc)
        age_seconds = (now - up).total_seconds()
    else:
        age_seconds = 0
    old_enough = age_seconds >= 45
    complete = has_score or has_text or has_name or old_enough
    print(
        "[cv_analysis] analysis-status app_id={} score={} cv_text_len={} has_name={} age_s={:.0f} -> pending={}".format(
            application_id, row["technical_score"], len(cv_text), has_name, age_seconds, not complete
        )
    )
    return complete

