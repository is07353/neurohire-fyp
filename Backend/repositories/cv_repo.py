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

