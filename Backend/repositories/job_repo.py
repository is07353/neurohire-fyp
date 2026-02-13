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


async def get_job_by_id(pool: asyncpg.Pool, job_id: int) -> dict | None:
    """Get a single job by ID with all details including questions."""
    async with pool.acquire() as conn:
        # Get job details
        job_row = await conn.fetchrow(
            """
            SELECT
                job_id,
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
                work_mode::text AS work_mode,
                salary_monthly_pkr,
                cv_score_weightage,
                video_score_weightage
            FROM jobs
            WHERE job_id = $1;
            """,
            job_id,
        )
        
        if not job_row:
            return None
        
        # Get job questions
        question_rows = await conn.fetch(
            """
            SELECT question_text
            FROM job_questions
            WHERE job_id = $1
            ORDER BY question_id;
            """,
            job_id,
        )
        
        questions = [r["question_text"] for r in question_rows]
        
        # Parse job_description JSON if it exists
        job_desc = job_row["job_description"]
        if isinstance(job_desc, dict):
            other_req = job_desc.get("other_requirements", job_row["other_requirements"] or "")
        else:
            other_req = job_row["other_requirements"] or ""
        
        # Convert work_mode from DB format ("ONSITE"/"REMOTE") to UI format ("Onsite"/"Remote")
        work_mode_ui = []
        if job_row["work_mode"]:
            if job_row["work_mode"] == "ONSITE":
                work_mode_ui = ["Onsite"]
            elif job_row["work_mode"] == "REMOTE":
                work_mode_ui = ["Remote"]
        
        return {
            "id": str(job_row["job_id"]),
            "recruiter_id": job_row["recruiter_id"],
            "title": job_row["job_title"],
            "company_name": job_row["company_name"] or "",
            "branch_name": job_row["branch_name"] or "",
            "location": job_row["location"] or "",
            "status": job_row["status"],
            "skills": list(job_row["skills"]) if job_row["skills"] else [],
            "minExperience": job_row["minimum_experience_years"] or 0,
            "otherRequirements": other_req,
            "workMode": work_mode_ui,
            "salary": job_row["salary_monthly_pkr"] or 0,
            "cv_score_weightage": job_row["cv_score_weightage"],
            "video_score_weightage": job_row["video_score_weightage"],
            "questions": questions,
        }


async def update_job_questions(
    pool: asyncpg.Pool,
    *,
    job_id: int,
    questions: list[str],
) -> None:
    """Replace all job questions for a job_id (delete old, insert new)."""
    async with pool.acquire() as conn:
        # Delete existing questions
        await conn.execute(
            "DELETE FROM job_questions WHERE job_id = $1;",
            job_id,
        )
        
        # Insert new questions
        cleaned = [q.strip() for q in questions if q and q.strip()]
        if cleaned:
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
                company_name,
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
            "company_name": r["company_name"] or "",
            "location": r["location"] or "",
            "status": r["status"],
            "salary_monthly_pkr": r["salary_monthly_pkr"] or 0,
            "cv_score_weightage": r["cv_score_weightage"],
            "video_score_weightage": r["video_score_weightage"],
        }
        for r in rows
    ]


async def update_job_status(pool: asyncpg.Pool, job_id: int, status: str) -> dict | None:
    """Update the status of a job (open/closed)."""
    if status not in ("open", "closed"):
        raise ValueError(f"Invalid status: {status}. Must be 'open' or 'closed'.")
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE jobs
            SET status = $2, updated_at = NOW()
            WHERE job_id = $1
            RETURNING job_id, job_title, company_name, location, status, salary_monthly_pkr,
                      cv_score_weightage, video_score_weightage;
            """,
            job_id,
            status,
        )
    return dict(row) if row else None


async def update_job(
    pool: asyncpg.Pool,
    *,
    job_id: int,
    job_title: str,
    company_name: str,
    branch_name: str,
    location: str,
    work_mode: str,
    salary_monthly_pkr: int,
    minimum_experience_years: int,
    skills: list[str],
    other_requirements: str,
    cv_score_weightage: int,
    video_score_weightage: int,
) -> dict | None:
    """Update all fields of an existing job."""
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
            UPDATE jobs
            SET
                job_title = $2,
                company_name = $3,
                branch_name = $4,
                job_description = $5,
                location = $6,
                work_mode = $7,
                salary_monthly_pkr = $8,
                minimum_experience_years = $9,
                skills = $10,
                other_requirements = $11,
                cv_score_weightage = $12,
                video_score_weightage = $13,
                updated_at = NOW()
            WHERE job_id = $1
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
            job_id,
            job_title,
            company_name,
            branch_name,
            job_description,
            location,
            work_mode,
            salary_monthly_pkr,
            minimum_experience_years,
            skills,
            other_requirements,
            cv_score_weightage,
            video_score_weightage,
        )
    return dict(row) if row else None


async def delete_job(pool: asyncpg.Pool, job_id: int) -> bool:
    """Delete a job and its associated questions.
    
    Due to CASCADE delete on job_questions relation, deleting a job
    will automatically delete all associated questions.
    """
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM jobs WHERE job_id = $1;",
            job_id,
        )
    # result is like "DELETE 1"
    return result.endswith(" 1")
