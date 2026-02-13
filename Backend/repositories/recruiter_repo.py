"""DB operations for recruiter accounts."""
import asyncpg
import hashlib
import secrets


def _hash_password(password: str) -> str:
  """Hash a password with a random salt (salt:hash)."""
  if not password:
    raise ValueError("Password must not be empty")
  salt = secrets.token_hex(16)
  digest = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
  return f"{salt}:{digest}"


def _verify_password(password: str, stored: str) -> bool:
  """Verify a password against a stored salt:hash string."""
  try:
    salt, digest = stored.split(":", 1)
  except ValueError:
    return False
  check = hashlib.sha256((salt + password).encode("utf-8")).hexdigest()
  return secrets.compare_digest(check, digest)


async def create_recruiter(
  pool: asyncpg.Pool,
  *,
  email: str,
  username: str,
  password: str,
  full_name: str,
  company_name: str,
  employee_id: str,
  recruiter_role: str | None = None,
) -> dict:
  """Create a recruiter row with status 'pending' linked to a company by name."""
  password_hash = _hash_password(password)

  async with pool.acquire() as conn:
    async with conn.transaction():
      # Find the company by name (case-insensitive match on company_name).
      company_row = await conn.fetchrow(
        """
        SELECT company_id
        FROM companies
        WHERE LOWER(company_name) = LOWER($1)
        """,
        company_name,
      )
      if not company_row:
        raise ValueError("Company not found. Please check the company name.")

      company_id = company_row["company_id"]

      # Enforce unique constraints for email / username / employee_id.
      existing = await conn.fetchrow(
        "SELECT recruiter_id FROM recruiters WHERE email = $1;",
        email,
      )
      if existing:
        raise ValueError("A recruiter with this email already exists")

      if username:
        existing_username = await conn.fetchrow(
          "SELECT recruiter_id FROM recruiters WHERE username = $1;",
          username,
        )
        if existing_username:
          raise ValueError("This username is already taken")

      if employee_id:
        existing_emp = await conn.fetchrow(
          "SELECT recruiter_id FROM recruiters WHERE employee_id = $1;",
          employee_id,
        )
        if existing_emp:
          raise ValueError("This employee ID is already registered")

      row = await conn.fetchrow(
        """
        INSERT INTO recruiters (
          company_id,
          full_name,
          email,
          password_hash,
          role,
          username,
          employee_id,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
        RETURNING
          recruiter_id,
          company_id,
          full_name,
          email,
          role,
          username,
          employee_id,
          status,
          created_at;
        """,
        company_id,
        full_name,
        email,
        password_hash,
        recruiter_role or "recruiter",
        username,
        employee_id,
      )

  return dict(row)


async def authenticate_recruiter(
  pool: asyncpg.Pool,
  *,
  email: str,
  password: str,
) -> dict | None:
  """Return recruiter public data if email/password are valid AND status is approved."""
  async with pool.acquire() as conn:
    row = await conn.fetchrow(
      """
      SELECT
        recruiter_id,
        full_name,
        email,
        password_hash,
        status
      FROM recruiters
      WHERE email = $1;
      """,
      email,
    )

  if not row:
    return None

  if not _verify_password(password, row["password_hash"]):
    return None

  if row["status"] != "approved":
    # Caller can decide how to present this to the user.
    return {
      "recruiter_id": row["recruiter_id"],
      "full_name": row["full_name"],
      "email": row["email"],
      "status": row["status"],
      "approved": False,
    }

  return {
    "recruiter_id": row["recruiter_id"],
    "full_name": row["full_name"],
    "email": row["email"],
    "status": row["status"],
    "approved": True,
  }


async def list_recruiters_for_company(
  pool: asyncpg.Pool,
  *,
  company_name: str,
) -> list[dict]:
  """List recruiters for a given company name (case-insensitive)."""
  async with pool.acquire() as conn:
    rows = await conn.fetch(
      """
      SELECT
        r.recruiter_id,
        r.full_name,
        r.email,
        r.employee_id,
        r.role,
        r.status,
        r.created_at
      FROM recruiters r
      JOIN companies c ON c.company_id = r.company_id
      WHERE LOWER(c.company_name) = LOWER($1)
      ORDER BY r.created_at DESC;
      """,
      company_name,
    )
  return [dict(r) for r in rows]


async def update_recruiter_status(
  pool: asyncpg.Pool,
  *,
  recruiter_id: int,
  status: str,
) -> dict | None:
  """Update a recruiter's status (approved, pending, disabled)."""
  async with pool.acquire() as conn:
    row = await conn.fetchrow(
      """
      UPDATE recruiters
      SET status = $2
      WHERE recruiter_id = $1
      RETURNING recruiter_id, full_name, email, status;
      """,
      recruiter_id,
      status,
    )
  return dict(row) if row else None


async def delete_recruiter(
  pool: asyncpg.Pool,
  *,
  recruiter_id: int,
) -> bool:
  """Permanently delete a recruiter."""
  async with pool.acquire() as conn:
    result = await conn.execute(
      "DELETE FROM recruiters WHERE recruiter_id = $1;",
      recruiter_id,
    )
  # result is like "DELETE 1"
  return result.endswith(" 1")

