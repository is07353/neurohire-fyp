"""Pure DB queries for jobs (list open, seed, backfill, weightage)."""
import json
import asyncpg


def _validate_weightage_sum_100(cv_score_weightage: int, video_score_weightage: int) -> None:
    if cv_score_weightage + video_score_weightage != 100:
        raise ValueError(
            "cv_score_weightage and video_score_weightage must sum to 100 "
            f"(got {cv_score_weightage} + {video_score_weightage} = {cv_score_weightage + video_score_weightage})"
        )


async def list_open_jobs(pool: asyncpg.Pool, lang: str = "en") -> list[dict]:
    """List all jobs with status 'open' for candidate job selection.
    
    Args:
        lang: Language code ('en' for English, 'ur' for Urdu). Defaults to 'en'.
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                job_id,
                job_title,
                job_title_ur,
                company_name,
                company_name_ur,
                branch_name,
                branch_name_ur,
                job_description,
                job_description_ur,
                status,
                skills,
                skills_ur,
                minimum_experience_years,
                minimum_experience_ur,
                other_requirements,
                other_requirements_ur,
                location,
                location_ur,
                work_mode::text AS work_mode,
                work_mode_ur,
                salary_monthly_pkr,
                salary_monthly_ur,
                cv_score_weightage,
                video_score_weightage
            FROM jobs
            WHERE status = 'open'
            ORDER BY job_id;
            """
        )
    
    use_urdu = lang.lower() == "ur"
    
    def _pick(field_en, field_ur):
        if use_urdu and field_ur:
            return field_ur
        return field_en
    
    return [
        {
            "id": str(r["job_id"]),
            "title": _pick(r["job_title"], r.get("job_title_ur")) or r["job_title"],
            "company_name": _pick(r["company_name"] or "", r.get("company_name_ur")) or "",
            "branch_name": _pick(r["branch_name"] or "", r.get("branch_name_ur")) or "",
            "job_description": _pick(r["job_description"], r.get("job_description_ur")) or r["job_description"],
            "status": r["status"],
            "location": _pick(r["location"] or "", r.get("location_ur")) or "",
            "type": "Full-time",
            "minExperience": r["minimum_experience_years"] or 0,
            "minExperienceUr": r.get("minimum_experience_ur"),
            "skills": (list(r["skills_ur"]) if use_urdu and r.get("skills_ur") else None) or (list(r["skills"]) if r["skills"] else []),
            "workMode": [r.get("work_mode_ur")] if (use_urdu and r.get("work_mode_ur")) else (["Onsite"] if r.get("work_mode") == "ONSITE" else (["Remote"] if r.get("work_mode") == "REMOTE" else [])),
            "salary": r["salary_monthly_pkr"] or 0,
            "salaryUr": r.get("salary_monthly_ur"),
            "otherRequirements": _pick(r["other_requirements"] or "", r.get("other_requirements_ur")) or "",
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
    job_title_ur: str | None = None,
    job_description_ur: str | None = None,
    company_name_ur: str | None = None,
    branch_name_ur: str | None = None,
    skills_ur: list[str] | None = None,
    other_requirements_ur: str | None = None,
    location_ur: str | None = None,
    work_mode_ur: str | None = None,
    salary_monthly_ur: str | None = None,
    minimum_experience_ur: str | None = None,
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

    # Ensure skills_ur is same length as skills (use English as fallback for missing)
    skills_ur_list = skills_ur if skills_ur is not None else []
    if len(skills_ur_list) < len(skills):
        skills_ur_list = list(skills_ur_list) + [skills[i] for i in range(len(skills_ur_list), len(skills))]
    skills_ur_list = skills_ur_list[: len(skills)]

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO jobs (
                recruiter_id,
                job_title,
                job_title_ur,
                company_name,
                company_name_ur,
                branch_name,
                branch_name_ur,
                job_description,
                job_description_ur,
                status,
                skills,
                skills_ur,
                minimum_experience_years,
                minimum_experience_ur,
                other_requirements,
                other_requirements_ur,
                location,
                location_ur,
                work_mode,
                work_mode_ur,
                salary_monthly_pkr,
                salary_monthly_ur,
                cv_score_weightage,
                video_score_weightage
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open', $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
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
            job_title_ur,
            company_name,
            company_name_ur,
            branch_name,
            branch_name_ur,
            job_description,
            job_description_ur,
            skills,
            skills_ur_list,
            minimum_experience_years,
            minimum_experience_ur,
            other_requirements,
            other_requirements_ur,
            location,
            location_ur,
            work_mode,
            work_mode_ur,
            salary_monthly_pkr,
            salary_monthly_ur,
            cv_score_weightage,
            video_score_weightage,
        )

    return dict(row)


async def insert_job_questions(
    pool: asyncpg.Pool,
    *,
    job_id: int,
    questions: list[str],
    questions_ur: list[str] | None = None,
) -> None:
    """Insert job-specific video questions for a job_id."""
    # Clean up any empty questions
    cleaned = [q.strip() for q in questions if q and q.strip()]
    if not cleaned:
        return

    # Match Urdu questions with English questions by index
    cleaned_ur = None
    if questions_ur:
        cleaned_ur = [q.strip() if q else None for q in questions_ur]
        # Ensure lists are same length (pad with None if needed)
        while len(cleaned_ur) < len(cleaned):
            cleaned_ur.append(None)
        cleaned_ur = cleaned_ur[:len(cleaned)]  # Trim if longer

    async with pool.acquire() as conn:
        if cleaned_ur:
            await conn.executemany(
                "INSERT INTO job_questions (job_id, question_text, question_text_ur) VALUES ($1, $2, $3);",
                [(job_id, q, q_ur) for q, q_ur in zip(cleaned, cleaned_ur)],
            )
        else:
            await conn.executemany(
                "INSERT INTO job_questions (job_id, question_text) VALUES ($1, $2);",
                [(job_id, q) for q in cleaned],
            )


async def get_job_by_id(pool: asyncpg.Pool, job_id: int, lang: str = "en") -> dict | None:
    """Get a single job by ID with all details including questions.
    
    Args:
        job_id: Job ID to fetch
        lang: Language code ('en' for English, 'ur' for Urdu). Defaults to 'en'.
    """
    async with pool.acquire() as conn:
        # Get job details
        job_row = await conn.fetchrow(
            """
            SELECT
                job_id,
                recruiter_id,
                job_title,
                job_title_ur,
                company_name,
                company_name_ur,
                branch_name,
                branch_name_ur,
                job_description,
                job_description_ur,
                status,
                skills,
                skills_ur,
                minimum_experience_years,
                minimum_experience_ur,
                other_requirements,
                other_requirements_ur,
                location,
                location_ur,
                work_mode::text AS work_mode,
                work_mode_ur,
                salary_monthly_pkr,
                salary_monthly_ur,
                cv_score_weightage,
                video_score_weightage
            FROM jobs
            WHERE job_id = $1;
            """,
            job_id,
        )
        
        if not job_row:
            return None
        
        # Get job questions (with Urdu if available)
        use_urdu = lang.lower() == "ur"
        question_rows = await conn.fetch(
            """
            SELECT question_text, question_text_ur
            FROM job_questions
            WHERE job_id = $1
            ORDER BY question_id;
            """,
            job_id,
        )
        
        questions = []
        for r in question_rows:
            if use_urdu and r["question_text_ur"]:
                questions.append(r["question_text_ur"])
            else:
                questions.append(r["question_text"])

        return _job_row_to_dict(job_row, questions, lang=lang)

    return None


async def get_job_questions_only(pool: asyncpg.Pool, job_id: int) -> list[str]:
    """Return ordered list of question text for a job (for Candidate Review video section)."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT question_text
            FROM job_questions
            WHERE job_id = $1
            ORDER BY question_id;
            """,
            job_id,
        )
    return [r["question_text"] for r in rows]


def _job_row_to_dict(job_row, questions: list[str], lang: str = "en") -> dict:
    """Build job dict from DB row and questions list.
    
    Args:
        job_row: Database row from jobs table
        questions: List of question texts (already filtered by lang)
        lang: Language code ('en' for English, 'ur' for Urdu). Defaults to 'en'.
    """
    use_urdu = lang.lower() == "ur"

    def _pick(en_val, ur_val):
        if use_urdu and ur_val:
            return ur_val
        return en_val

    title = _pick(job_row["job_title"], job_row.get("job_title_ur")) or job_row["job_title"]
    company_name = _pick(job_row["company_name"] or "", job_row.get("company_name_ur")) or ""
    branch_name = _pick(job_row["branch_name"] or "", job_row.get("branch_name_ur")) or ""
    location = _pick(job_row["location"] or "", job_row.get("location_ur")) or ""

    job_desc = job_row["job_description"]
    other_req_ur = job_row.get("other_requirements_ur")
    if use_urdu and other_req_ur:
        other_req = other_req_ur
    else:
        if isinstance(job_desc, dict):
            other_req = job_desc.get("other_requirements", job_row["other_requirements"] or "")
        else:
            other_req = job_row["other_requirements"] or ""

    skills = (list(job_row["skills_ur"]) if use_urdu and job_row.get("skills_ur") else None) or (list(job_row["skills"]) if job_row["skills"] else [])

    work_mode_ui = []
    if job_row["work_mode"]:
        if use_urdu and job_row.get("work_mode_ur"):
            work_mode_ui = [job_row["work_mode_ur"]]
        elif job_row["work_mode"] == "ONSITE":
            work_mode_ui = ["Onsite"]
        elif job_row["work_mode"] == "REMOTE":
            work_mode_ui = ["Remote"]

    salary = job_row["salary_monthly_pkr"] or 0
    min_exp = job_row["minimum_experience_years"] or 0

    return {
        "id": str(job_row["job_id"]),
        "recruiter_id": job_row["recruiter_id"],
        "title": title,
        "company_name": company_name,
        "branch_name": branch_name,
        "location": location,
        "status": job_row["status"],
        "skills": skills,
        "minExperience": min_exp,
        "minExperienceUr": job_row.get("minimum_experience_ur"),
        "otherRequirements": other_req,
        "workMode": work_mode_ui,
        "salary": salary,
        "salaryUr": job_row.get("salary_monthly_ur"),
        "cv_score_weightage": job_row["cv_score_weightage"],
        "video_score_weightage": job_row["video_score_weightage"],
        "questions": questions,
    }


async def update_job_questions(
    pool: asyncpg.Pool,
    *,
    job_id: int,
    questions: list[str],
    questions_ur: list[str] | None = None,
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
        if not cleaned:
            return
        
        # Match Urdu questions with English questions by index
        cleaned_ur = None
        if questions_ur:
            cleaned_ur = [q.strip() if q else None for q in questions_ur]
            # Ensure lists are same length (pad with None if needed)
            while len(cleaned_ur) < len(cleaned):
                cleaned_ur.append(None)
            cleaned_ur = cleaned_ur[:len(cleaned)]  # Trim if longer
        
        if cleaned_ur:
            await conn.executemany(
                "INSERT INTO job_questions (job_id, question_text, question_text_ur) VALUES ($1, $2, $3);",
                [(job_id, q, q_ur) for q, q_ur in zip(cleaned, cleaned_ur)],
            )
        else:
            await conn.executemany(
                "INSERT INTO job_questions (job_id, question_text) VALUES ($1, $2);",
                [(job_id, q) for q in cleaned],
            )


async def list_jobs_for_company(pool: asyncpg.Pool, company_name: str) -> list[dict]:
    """List all jobs posted by recruiters belonging to this company (by company name). Jobs only, no applicant counts."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                j.job_id,
                j.job_title,
                j.company_name,
                j.location,
                j.status,
                j.salary_monthly_pkr,
                j.created_at,
                r.full_name AS recruiter_name
            FROM jobs j
            INNER JOIN recruiters r ON r.recruiter_id = j.recruiter_id
            INNER JOIN companies c ON c.company_id = r.company_id
            WHERE LOWER(TRIM(c.company_name)) = LOWER(TRIM($1))
            ORDER BY j.created_at DESC, j.job_id DESC;
            """,
            company_name,
        )
    return [
        {
            "id": str(r["job_id"]),
            "title": r["job_title"],
            "company_name": r["company_name"] or "",
            "location": r["location"] or "",
            "status": r["status"],
            "salary_monthly_pkr": r["salary_monthly_pkr"] or 0,
            "created_at": r["created_at"],
            "recruiter_name": r["recruiter_name"] or "Recruiter",
        }
        for r in rows
    ]


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
    job_title_ur: str | None = None,
    job_description_ur: str | None = None,
    company_name_ur: str | None = None,
    branch_name_ur: str | None = None,
    skills_ur: list[str] | None = None,
    other_requirements_ur: str | None = None,
    location_ur: str | None = None,
    work_mode_ur: str | None = None,
    salary_monthly_ur: str | None = None,
    minimum_experience_ur: str | None = None,
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

    skills_ur_list = skills_ur if skills_ur is not None else []
    if len(skills_ur_list) < len(skills):
        skills_ur_list = list(skills_ur_list) + [skills[i] for i in range(len(skills_ur_list), len(skills))]
    skills_ur_list = skills_ur_list[: len(skills)]
    
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE jobs
            SET
                job_title = $2,
                job_title_ur = $3,
                company_name = $4,
                company_name_ur = $5,
                branch_name = $6,
                branch_name_ur = $7,
                job_description = $8,
                job_description_ur = $9,
                location = $10,
                location_ur = $11,
                work_mode = $12,
                work_mode_ur = $13,
                salary_monthly_pkr = $14,
                salary_monthly_ur = $15,
                minimum_experience_years = $16,
                minimum_experience_ur = $17,
                skills = $18,
                skills_ur = $19,
                other_requirements = $20,
                other_requirements_ur = $21,
                cv_score_weightage = $22,
                video_score_weightage = $23,
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
            job_title_ur,
            company_name,
            company_name_ur,
            branch_name,
            branch_name_ur,
            job_description,
            job_description_ur,
            location,
            location_ur,
            work_mode,
            work_mode_ur,
            salary_monthly_pkr,
            salary_monthly_ur,
            minimum_experience_years,
            minimum_experience_ur,
            skills,
            skills_ur_list,
            other_requirements,
            other_requirements_ur,
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
