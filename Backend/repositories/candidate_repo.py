"""Pure DB queries for candidates."""
import asyncpg


async def list_candidates(pool: asyncpg.Pool, limit: int = 5) -> list[dict]:
    """Read a few rows from the candidates table."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT candidate_id, full_name, email, phone, address
            FROM candidates
            ORDER BY candidate_id
            LIMIT $1;
            """,
            limit,
        )
    return [dict(r) for r in rows]


async def create_test_candidate(
    pool: asyncpg.Pool,
    full_name: str = "Khawar Mehmood",
    email: str = "khawar@gmail.com",
    phone: str = "0000000000",
    address: str = "Lahore, Pakistan",
) -> dict:
    """Insert one candidate row and return it."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO candidates (full_name, email, phone, address)
            VALUES ($1, $2, $3, $4)
            RETURNING candidate_id, full_name, email, phone, address;
            """,
            full_name,
            email,
            phone,
            address,
        )
    return dict(row)
