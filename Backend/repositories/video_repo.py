"""DB operations for video interview submissions (video_submissions table)."""
import asyncpg


async def upsert_video_metadata(
    pool: asyncpg.Pool,
    *,
    application_id: int,
    question_index: int,
    question_text: str,
    video_url: str,
    video_file_key: str | None,
    file_size: int | None,
    mime_type: str | None,
) -> dict:
    """Insert or update the video_submissions row for an application + question index.

    The schema enforces one video per (application_id, question_index). If a
    row already exists for that pair, we update it with the latest URL/metadata.
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO video_submissions (
                application_id,
                question_index,
                question_text,
                video_url,
                video_file_key,
                file_size,
                mime_type
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (application_id, question_index) DO UPDATE SET
                question_text = EXCLUDED.question_text,
                video_url = EXCLUDED.video_url,
                video_file_key = EXCLUDED.video_file_key,
                file_size = EXCLUDED.file_size,
                mime_type = EXCLUDED.mime_type,
                created_at = NOW()
            RETURNING
                video_id,
                application_id,
                question_index,
                question_text,
                video_url,
                video_file_key,
                file_size,
                mime_type,
                created_at;
            """,
            application_id,
            question_index,
            question_text,
            video_url,
            video_file_key,
            file_size,
            mime_type,
        )

    return dict(row)


async def list_by_application(pool: asyncpg.Pool, application_id: int) -> list[dict]:
    """List all video submissions for an application, ordered by question_index (for Candidate Review)."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                question_index,
                question_text,
                video_url,
                audio_transcript,
                face_presence_ratio,
                "camera_engagement_Ratio",
                yaw_variance
            FROM video_submissions
            WHERE application_id = $1
            ORDER BY question_index;
            """,
            application_id,
        )
    return [dict(r) for r in rows]


async def update_video_analysis_fields(
    pool: asyncpg.Pool,
    *,
    application_id: int,
    question_index: int,
    audio_transcript: str | None,
    face_presence_ratio: float | None,
    camera_engagement_Ratio: float | None,
    yaw_variance: float | None,
) -> None:
    """Update per-question analysis fields (transcript + engagement metrics) for a video submission."""
    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE video_submissions
            SET
                audio_transcript = $3,
                face_presence_ratio = $4,
                "camera_engagement_Ratio" = $5,
                yaw_variance = $6
            WHERE application_id = $1
              AND question_index = $2;
            """,
            application_id,
            question_index,
            audio_transcript,
            face_presence_ratio,
            camera_engagement_Ratio,
            yaw_variance,
        )


