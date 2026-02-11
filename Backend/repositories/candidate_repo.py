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


async def create_candidate_minimal(pool: asyncpg.Pool) -> dict:
    """Insert a minimal candidate row after CV upload.

    At upload time we don't yet have parsed CV fields, so we let them be NULL
    and expect later steps (CV parsing + review form) to update this row.
    """
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO candidates (full_name, email, phone, address)
            VALUES ($1, $2, $3, $4)
            RETURNING candidate_id, full_name, email, phone, address;
            """,
            None,
            None,
            None,
            None,
        )
    return dict(row)

