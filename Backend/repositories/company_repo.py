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


async def get_company_profile_by_name(
  pool: asyncpg.Pool,
  *,
  company_name: str,
) -> dict | None:
  """Return company profile (name, description, industry, website_url) by company name (case-insensitive)."""
  async with pool.acquire() as conn:
    row = await conn.fetchrow(
      """
      SELECT company_name, company_description, industry, website_url
      FROM companies
      WHERE LOWER(TRIM(company_name)) = LOWER(TRIM($1));
      """,
      company_name,
    )
  return dict(row) if row else None


async def get_company_analytics(pool: asyncpg.Pool, *, company_name: str) -> dict:
  """Return company-wide analytics for dashboard: job counts, applicant counts, recruiters, charts data."""
  norm_name = company_name.strip()
  async with pool.acquire() as conn:
    # Company id for this name
    company_row = await conn.fetchrow(
      "SELECT company_id FROM companies WHERE LOWER(TRIM(company_name)) = LOWER($1);",
      norm_name,
    )
    if not company_row:
      return _empty_analytics()

    company_id = company_row["company_id"]

    # Job counts by status (open, closed) for this company's recruiters
    job_stats = await conn.fetch(
      """
      SELECT j.status, COUNT(*) AS cnt
      FROM jobs j
      INNER JOIN recruiters r ON r.recruiter_id = j.recruiter_id
      WHERE r.company_id = $1
      GROUP BY j.status;
      """,
      company_id,
    )
    total_jobs = 0
    jobs_open = 0
    jobs_closed = 0
    for row in job_stats:
      total_jobs += row["cnt"]
      if (row["status"] or "").lower() == "open":
        jobs_open = row["cnt"]
      elif (row["status"] or "").lower() == "closed":
        jobs_closed = row["cnt"]

    # Total applicants (applications to jobs of this company's recruiters)
    app_row = await conn.fetchrow(
      """
      SELECT COUNT(*) AS total
      FROM candidate_applications ca
      INNER JOIN jobs j ON j.job_id = ca.job_id
      INNER JOIN recruiters r ON r.recruiter_id = j.recruiter_id
      WHERE r.company_id = $1;
      """,
      company_id,
    )
    total_applicants = app_row["total"] if app_row else 0

    # Recruiters by status
    recruiter_stats = await conn.fetch(
      """
      SELECT status, COUNT(*) AS cnt
      FROM recruiters
      WHERE company_id = $1
      GROUP BY status;
      """,
      company_id,
    )
    total_recruiters = 0
    recruiters_approved = 0
    recruiters_pending = 0
    for row in recruiter_stats:
      total_recruiters += row["cnt"]
      s = (row["status"] or "").lower()
      if s == "approved":
        recruiters_approved = row["cnt"]
      elif s == "pending":
        recruiters_pending = row["cnt"]

    # Applicants per recruiter (for bar chart)
    applicants_per_recruiter = await conn.fetch(
      """
      SELECT r.full_name AS recruiter_name, COUNT(ca.application_id) AS applicants
      FROM recruiters r
      LEFT JOIN jobs j ON j.recruiter_id = r.recruiter_id
      LEFT JOIN candidate_applications ca ON ca.job_id = j.job_id
      WHERE r.company_id = $1
      GROUP BY r.recruiter_id, r.full_name
      ORDER BY applicants DESC;
      """,
      company_id,
    )
    recruiter_chart = [
      {"recruiter": (r["recruiter_name"] or "Recruiter").strip() or "Recruiter", "applicants": r["applicants"] or 0}
      for r in applicants_per_recruiter
    ]

    # Monthly hiring trends: jobs and applications per month (from DB, ordered by month)
    monthly = []
    try:
      monthly = await conn.fetch(
        """
        WITH job_months AS (
          SELECT date_trunc('month', j.created_at)::date AS month_start, COUNT(*) AS jobs
          FROM jobs j
          INNER JOIN recruiters r ON r.recruiter_id = j.recruiter_id
          WHERE r.company_id = $1
          GROUP BY date_trunc('month', j.created_at)
        ),
        app_months AS (
          SELECT date_trunc('month', ca.created_at)::date AS month_start, COUNT(*) AS applicants
          FROM candidate_applications ca
          INNER JOIN jobs j ON j.job_id = ca.job_id
          INNER JOIN recruiters r ON r.recruiter_id = j.recruiter_id
          WHERE r.company_id = $1
          GROUP BY date_trunc('month', ca.created_at)
        )
        SELECT COALESCE(j.month_start, a.month_start) AS month_start,
          COALESCE(j.jobs, 0)::int AS jobs,
          COALESCE(a.applicants, 0)::int AS applicants
        FROM job_months j
        FULL OUTER JOIN app_months a ON a.month_start = j.month_start
        ORDER BY month_start DESC
        LIMIT 12;
        """,
        company_id,
      )
    except Exception:
      monthly = []

  month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  monthly_trends = []
  for row in reversed(list(monthly)):
    try:
      dt = row.get("month_start")
      if dt and hasattr(dt, "month"):
        month_label = month_names[dt.month - 1]
        year = dt.year
      else:
        month_label = "?"
        year = 0
      monthly_trends.append({
        "month": month_label,
        "year": year,
        "jobs": row.get("jobs") if row.get("jobs") is not None else 0,
        "applicants": row.get("applicants") if row.get("applicants") is not None else 0,
      })
    except Exception:
      pass

  avg_applicants = round(total_applicants / total_jobs, 1) if total_jobs else 0

  return {
    "total_jobs": total_jobs,
    "jobs_open": jobs_open,
    "jobs_closed": jobs_closed,
    "total_applicants": total_applicants,
    "total_recruiters": total_recruiters,
    "recruiters_approved": recruiters_approved,
    "recruiters_pending": recruiters_pending,
    "avg_applicants_per_job": avg_applicants,
    "applicants_per_recruiter": recruiter_chart,
    "job_status_distribution": [
      {"name": "Open Jobs", "value": jobs_open, "color": "#10b981"},
      {"name": "Closed Jobs", "value": jobs_closed, "color": "#6b7280"},
    ],
    "monthly_trends": monthly_trends,
  }


def _empty_analytics() -> dict:
  return {
    "total_jobs": 0,
    "jobs_open": 0,
    "jobs_closed": 0,
    "total_applicants": 0,
    "total_recruiters": 0,
    "recruiters_approved": 0,
    "recruiters_pending": 0,
    "avg_applicants_per_job": 0,
    "applicants_per_recruiter": [],
    "job_status_distribution": [{"name": "Open Jobs", "value": 0, "color": "#10b981"}, {"name": "Closed Jobs", "value": 0, "color": "#6b7280"}],
    "monthly_trends": [],
  }

