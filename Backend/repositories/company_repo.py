"""DB operations for companies (company accounts)."""
import asyncpg
import hashlib
import secrets


def _hash_password(password: str) -> str:
  """Hash a password with a random salt (salt:hash).

  NOTE: For production, prefer bcrypt/argon2. This is a simple FYP-safe helper.
  """
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


async def create_company(
  pool: asyncpg.Pool,
  *,
  company_name: str,
  company_description: str,
  industry: str,
  website_url: str | None,
  contact_email: str,
  contact_person_name: str,
  contact_phone: str,
  password: str,
) -> dict:
  """Insert a new company row; raises if email already exists."""
  password_hash = _hash_password(password)

  async with pool.acquire() as conn:
    async with conn.transaction():
      # Enforce unique email at the application level first for clearer error.
      existing = await conn.fetchrow(
        "SELECT company_id FROM companies WHERE contact_email = $1;",
        contact_email,
      )
      if existing:
        raise ValueError("A company with this email already exists")

      row = await conn.fetchrow(
        """
        INSERT INTO companies (
          company_name,
          company_description,
          industry,
          website_url,
          contact_email,
          contact_person_name,
          contact_phone,
          password_hash
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          company_id,
          company_name,
          company_description,
          industry,
          website_url,
          contact_email,
          contact_person_name,
          contact_phone,
          created_at;
        """,
        company_name,
        company_description,
        industry,
        website_url,
        contact_email,
        contact_person_name,
        contact_phone,
        password_hash,
      )

  return dict(row)


async def authenticate_company(
  pool: asyncpg.Pool,
  *,
  email: str,
  password: str,
) -> dict | None:
  """Return company public data if email/password are valid, else None."""
  async with pool.acquire() as conn:
    row = await conn.fetchrow(
      """
      SELECT
        company_id,
        company_name,
        contact_email,
        password_hash
      FROM companies
      WHERE contact_email = $1;
      """,
      email,
    )

  if not row:
    return None

  if not _verify_password(password, row["password_hash"]):
    return None

  return {
    "company_id": row["company_id"],
    "company_name": row["company_name"],
    "contact_email": row["contact_email"],
  }

