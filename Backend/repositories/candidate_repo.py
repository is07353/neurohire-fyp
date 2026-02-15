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


async def get_candidate_by_id(pool: asyncpg.Pool, candidate_id: int) -> dict | None:
    """Get a single candidate by id (for overview / review screen)."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT candidate_id, full_name, email, phone, address
            FROM candidates
            WHERE candidate_id = $1;
            """,
            candidate_id,
        )
    return dict(row) if row else None


async def update_candidate_from_extraction(
    pool: asyncpg.Pool,
    candidate_id: int,
    *,
    full_name: str | None = None,
    email: str | None = None,
    phone: str | None = None,
    address: str | None = None,
) -> None:
    """Update candidate with extracted fields from CV analysis (only non-empty values)."""
    updates = []
    args = []
    n = 1
    if full_name is not None and str(full_name).strip():
        updates.append(f"full_name = ${n}")
        args.append(str(full_name).strip())
        n += 1
    if email is not None and str(email).strip():
        updates.append(f"email = ${n}")
        args.append(str(email).strip())
        n += 1
    if phone is not None and str(phone).strip():
        updates.append(f"phone = ${n}")
        args.append(str(phone).strip())
        n += 1
    if address is not None and str(address).strip():
        updates.append(f"address = ${n}")
        args.append(str(address).strip())
        n += 1
    if not updates:
        return
    args.append(candidate_id)
    async with pool.acquire() as conn:
        await conn.execute(
            f"UPDATE candidates SET {', '.join(updates)} WHERE candidate_id = ${n};",
            *args,
        )


async def update_candidate_review(
    pool: asyncpg.Pool,
    candidate_id: int,
    *,
    full_name: str,
    email: str,
    phone: str,
    address: str,
) -> None:
    """Update candidate with values from the Review Your Information form (saves to candidates table)."""
    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE candidates
            SET full_name = $1, email = $2, phone = $3, address = $4
            WHERE candidate_id = $5;
            """,
            (full_name or "").strip() or None,
            (email or "").strip() or None,
            (phone or "").strip() or None,
            (address or "").strip() or None,
            candidate_id,
        )

