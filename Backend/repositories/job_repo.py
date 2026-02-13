"""Pure DB queries for jobs (list open, seed, backfill, weightage)."""
import json
import asyncpg


def _validate_weightage_sum_100(cv_score_weightage: int, video_score_weightage: int) -> None:
    if cv_score_weightage + video_score_weightage != 100:
        raise ValueError(
            "cv_score_weightage and video_score_weightage must sum to 100 "
            f"(got {cv_score_weightage} + {video_score_weightage} = {cv_score_weightage + video_score_weightage})"
        )


async def list_open_jobs(pool: asyncpg.Pool) -> list[dict]:
    """List all jobs with status 'open' for candidate job selection."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                job_id,
                job_title,
                company_name,
                branch_name,
                job_description,
                status,
                skills,
                minimum_experience_years,
                other_requirements,
                location,
                work_mode::text AS work_mode,
                salary_monthly_pkr,
                cv_score_weightage,
                video_score_weightage
            FROM jobs
            WHERE status = 'open'
            ORDER BY job_id;
            """
        )
    return [
        {
            "id": str(r["job_id"]),
            "title": r["job_title"],
            "company_name": r["company_name"] or "",
            "branch_name": r["branch_name"] or "",
            "job_description": r["job_description"],
            "status": r["status"],
            "location": r["location"] or "",
            "type": "Full-time",
            "minExperience": r["minimum_experience_years"] or 0,
            "skills": list(r["skills"]) if r["skills"] else [],
            "workMode": [r["work_mode"]] if r["work_mode"] else [],
            "salary": r["salary_monthly_pkr"] or 0,
            "otherRequirements": r["other_requirements"] or "",
            "cv_score_weightage": r["cv_score_weightage"],
            "video_score_weightage": r["video_score_weightage"],
        }
        for r in rows
    ]


# Seed data: (title, desc, location, work_mode, company_name, branch_name, [salary, min_exp, skills, other_req, cv_w, vid_w])
_SAMPLE_JOBS = [
    (
        "Store Worker",
        "Retail store operations and customer service.",
        "Gulberg, Lahore",
        "ONSITE",
        "RetailCo Pakistan",
        "Gulberg Branch",
        [35000, 1, ["Customer Handling", "Inventory", "Stock Management"], "Must be able to stand for long periods. Basic Urdu and English communication required. Must be comfortable working in shifts including weekends. Physical fitness required for handling inventory.", 50, 50],
    ),
    (
        "Cashier",
        "Handle cash and customer transactions.",
        "DHA, Karachi",
        "ONSITE",
        "RetailCo Pakistan",
        "DHA Branch",
        [32000, 0, ["Cash Handling", "Customer Service", "POS Systems"], "Basic mathematics skills required. Must be honest and trustworthy. Previous cash handling experience preferred but not required. Comfortable working in a fast-paced environment.", 50, 50],
    ),
    (
        "Delivery Rider",
        "Delivery and navigation.",
        "F-7, Islamabad",
        "ONSITE",
        "QuickDeliver",
        "Islamabad Hub",
        [25000, 0, ["Delivery", "Navigation", "Customer Handling"], "Valid motorcycle license required. Must own or have access to a reliable motorcycle. Knowledge of Islamabad routes. Mobile phone with internet connection required. Weather-resistant and punctual.", 50, 50],
    ),
    (
        "Store Worker",
        "Retail store operations, Saddar branch.",
        "Saddar, Rawalpindi",
        "ONSITE",
        "RetailCo Pakistan",
        "Saddar Branch",
        [38000, 2, ["Customer Handling", "Inventory", "Stock Management"], "Minimum 2 years retail experience required. Team leadership skills preferred. Ability to train new staff members. Strong organizational and communication skills.", 50, 50],
    ),
    (
        "Customer Service Representative",
        "Remote customer support.",
        "Johar Town, Lahore",
        "REMOTE",
        "SupportPro",
        "Remote",
        [40000, 1, ["Customer Service", "Communication", "Problem Solving"], "Excellent Urdu and English communication skills. Computer literacy required. Reliable internet connection and quiet workspace at home. Customer service experience in retail or call center preferred.", 50, 50],
    ),
]

_JOB_COMPANY_BRANCH_MAP = {
    ("Store Worker", "Gulberg, Lahore"): ("RetailCo Pakistan", "Gulberg Branch"),
    ("Cashier", "DHA, Karachi"): ("RetailCo Pakistan", "DHA Branch"),
    ("Delivery Rider", "F-7, Islamabad"): ("QuickDeliver", "Islamabad Hub"),
    ("Store Worker", "Saddar, Rawalpindi"): ("RetailCo Pakistan", "Saddar Branch"),
    ("Customer Service Representative", "Johar Town, Lahore"): ("SupportPro", "Remote"),
}


async def seed_jobs(pool: asyncpg.Pool) -> dict:
    """Ensure one recruiter exists, then insert sample open jobs if none. Idempotent."""
    async with pool.acquire() as conn:
        recruiter = await conn.fetchrow("SELECT recruiter_id FROM recruiters LIMIT 1;")
        if not recruiter:
            await conn.execute(
                """
                INSERT INTO recruiters (full_name, email, password_hash, role)
                VALUES ($1, $2, $3, $4);
                """,
                "NeuroHire Recruiter",
                "recruiter@neurohire.com",
                "placeholder_hash_change_me",
                "recruiter",
            )
            recruiter = await conn.fetchrow(
                "SELECT recruiter_id FROM recruiters ORDER BY recruiter_id DESC LIMIT 1;"
            )
        recruiter_id = recruiter["recruiter_id"]

        existing = await conn.fetchval("SELECT COUNT(*) FROM jobs WHERE status = 'open';")
        if existing and existing > 0:
            return {"message": "Jobs already seeded", "count": existing}

        for title, desc, location, work_mode, company_name, branch_name, rest in _SAMPLE_JOBS:
            salary, min_exp, skills, other_req, cv_w, vid_w = rest
            _validate_weightage_sum_100(cv_w, vid_w)
            # Build JSON job_description combining title, skills, and other requirements
            job_description = json.dumps(
                {
                    "job_title": title,
                    "skills": skills,
                    "other_requirements": other_req,
                }
            )
            await conn.execute(
                """
                INSERT INTO jobs (
                    recruiter_id, job_title, company_name, branch_name, job_description, status,
                    skills, minimum_experience_years, other_requirements,
                    location, work_mode, salary_monthly_pkr,
                    cv_score_weightage, video_score_weightage
                ) VALUES ($1, $2, $3, $4, $5, 'open', $6, $7, $8, $9, $10, $11, $12, $13);
                """,
                recruiter_id,
                title,
                company_name,
                branch_name,
                job_description,
                skills,
                min_exp,
                other_req,
                location,
                work_mode,
                salary,
                cv_w,
                vid_w,
            )
        count = await conn.fetchval("SELECT COUNT(*) FROM jobs WHERE status = 'open';")
    return {"message": "Jobs seeded", "count": count}


async def update_jobs_company_branch(pool: asyncpg.Pool) -> int:
    """Backfill company_name and branch_name for rows that have them empty. Returns updated count."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT job_id, job_title, location
            FROM jobs
            WHERE (company_name IS NULL OR TRIM(company_name) = '')
               OR (branch_name IS NULL OR TRIM(branch_name) = '');
            """
        )
        updated = 0
        for r in rows:
            key = (r["job_title"], (r["location"] or "").strip())
            company_name, branch_name = _JOB_COMPANY_BRANCH_MAP.get(key, ("Company", "Main Branch"))
            await conn.execute(
                "UPDATE jobs SET company_name = $1, branch_name = $2 WHERE job_id = $3;",
                company_name,
                branch_name,
                r["job_id"],
            )
            updated += 1
    return updated


async def set_one_job_weightage_75_25(pool: asyncpg.Pool) -> dict | None:
    """Set the first job (min job_id) to cv=75, video=25. Returns updated row or None."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE jobs
            SET cv_score_weightage = 75, video_score_weightage = 25
            WHERE job_id = (SELECT MIN(job_id) FROM jobs)
            RETURNING job_id, job_title, cv_score_weightage, video_score_weightage;
            """
        )
    return dict(row) if row else None


async def create_job(
    pool: asyncpg.Pool,
    *,
    recruiter_id: int,
    job_title: str,
    company_name: str,
    branch_name: str,
    job_description: str,
    location: str,
    work_mode: str,
    salary_monthly_pkr: int,
    minimum_experience_years: int,
    skills: list[str],
    other_requirements: str,
    cv_score_weightage: int,
    video_score_weightage: int,
) -> dict:
    """Insert a new job row."""
    _validate_weightage_sum_100(cv_score_weightage, video_score_weightage)

    # Build JSON job_description combining title, skills, and other requirements
    job_description = json.dumps(
        {
            "job_title": job_title,
            "skills": skills,
            "other_requirements": other_requirements,
        }
    )

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO jobs (
                recruiter_id,
                job_title,
                company_name,
                branch_name,
                job_description,
                status,
                skills,
                minimum_experience_years,
                other_requirements,
                location,
                work_mode,
                salary_monthly_pkr,
                cv_score_weightage,
                video_score_weightage
            )
            VALUES ($1, $2, $3, $4, $5, 'open', $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING
                job_id,
                job_title,
                company_name,
                branch_name,
                location,
                status,
                salary_monthly_pkr,
                cv_score_weightage,
                video_score_weightage;
            """,
            recruiter_id,
            job_title,
            company_name,
            branch_name,
            job_description,
            skills,
            minimum_experience_years,
            other_requirements,
            location,
            work_mode,
            salary_monthly_pkr,
            cv_score_weightage,
            video_score_weightage,
        )

    return dict(row)


async def insert_job_questions(
    pool: asyncpg.Pool,
    *,
    job_id: int,
    questions: list[str],
) -> None:
    """Insert job-specific video questions for a job_id."""
    # Clean up any empty questions
    cleaned = [q.strip() for q in questions if q and q.strip()]
    if not cleaned:
        return

    async with pool.acquire() as conn:
        await conn.executemany(
            "INSERT INTO job_questions (job_id, question_text) VALUES ($1, $2);",
            [(job_id, q) for q in cleaned],
        )


async def list_jobs_for_recruiter(pool: asyncpg.Pool, recruiter_id: int) -> list[dict]:
    """List all jobs created by a specific recruiter."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                job_id,
                job_title,
                location,
                status,
                salary_monthly_pkr,
                cv_score_weightage,
                video_score_weightage
            FROM jobs
            WHERE recruiter_id = $1
            ORDER BY created_at DESC, job_id DESC;
            """,
            recruiter_id,
        )
    return [
        {
            "id": str(r["job_id"]),
            "title": r["job_title"],
            "location": r["location"] or "",
            "status": r["status"],
            "cv_score_weightage": r["cv_score_weightage"],
            "video_score_weightage": r["video_score_weightage"],
        }
        for r in rows
    ]
