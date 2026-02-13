"""API endpoints for recruiter sign-up, login, approvals, and job listing."""
import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from pydantic import BaseModel, EmailStr

from repositories import recruiter_repo, job_repo, application_repo

router = APIRouter(prefix="/recruiter", tags=["recruiter"])


async def get_db_pool(request: Request) -> asyncpg.Pool:
  return request.app.state.db_pool


class RecruiterSignUpPayload(BaseModel):
  email: EmailStr
  username: str
  password: str
  fullName: str
  companyName: str
  employeeId: str
  recruiterRole: str | None = None


class RecruiterLoginPayload(BaseModel):
  email: EmailStr
  password: str


class RecruiterPublic(BaseModel):
  recruiterId: int
  fullName: str
  email: EmailStr
  status: str


@router.post("/signup", response_model=RecruiterPublic, status_code=status.HTTP_201_CREATED)
async def recruiter_signup(
  payload: RecruiterSignUpPayload,
  pool: asyncpg.Pool = Depends(get_db_pool),
):
  """Create a new recruiter account with status 'pending'."""
  try:
    row = await recruiter_repo.create_recruiter(
      pool,
      email=str(payload.email),
      username=payload.username,
      password=payload.password,
      full_name=payload.fullName,
      company_name=payload.companyName,
      employee_id=payload.employeeId,
      recruiter_role=payload.recruiterRole,
    )
  except ValueError as exc:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

  return RecruiterPublic(
    recruiterId=row["recruiter_id"],
    fullName=row["full_name"],
    email=row["email"],
    status=row["status"],
  )


@router.post("/login", response_model=RecruiterPublic)
async def recruiter_login(
  payload: RecruiterLoginPayload,
  pool: asyncpg.Pool = Depends(get_db_pool),
):
  """Login for recruiters – only approved accounts can log in."""
  result = await recruiter_repo.authenticate_recruiter(
    pool,
    email=str(payload.email),
    password=payload.password,
  )
  if not result:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Invalid email or password",
    )

  if not result.get("approved"):
    raise HTTPException(
      status_code=status.HTTP_403_FORBIDDEN,
      detail="Recruiter account is not approved yet",
    )

  return RecruiterPublic(
    recruiterId=result["recruiter_id"],
    fullName=result["full_name"],
    email=result["email"],
    status=result["status"],
  )


class RecruiterJob(BaseModel):
  id: str
  title: str
  companyName: str
  location: str
  status: str
  salary: int
  cvWeight: int
  videoWeight: int
  applicantCount: int = 0


@router.get("/jobs", response_model=list[RecruiterJob])
async def list_recruiter_jobs(
  recruiter_id: int | None = Query(None, description="Filter jobs by recruiter ID"),
  pool: asyncpg.Pool = Depends(get_db_pool),
):
  """List jobs for recruiter dashboard.

  If recruiter_id is provided, only jobs created by that recruiter are returned.
  Otherwise, all open jobs are returned (fallback/default).
  """
  print(f"list_recruiter_jobs: recruiter_id={recruiter_id}")  # Debug logging
  if recruiter_id is not None:
    rows = await job_repo.list_jobs_for_recruiter(pool, recruiter_id=recruiter_id)
    print(f"list_recruiter_jobs: Found {len(rows)} jobs for recruiter {recruiter_id}")  # Debug logging
  else:
    rows = await job_repo.list_open_jobs(pool)
    print(f"list_recruiter_jobs: Found {len(rows)} open jobs (no recruiter_id filter)")  # Debug logging

  # Fetch applicant counts per job
  job_ids = [int(r["id"]) for r in rows if r.get("id")]
  applicant_counts = await application_repo.count_applications_by_job(pool, job_ids) if job_ids else {}

  # Map candidate-facing job structure to recruiter dashboard structure.
  jobs: list[RecruiterJob] = []
  for r in rows:
    jid = int(r.get("id") or 0)
    jobs.append(
      RecruiterJob(
        id=str(r.get("id") or ""),
        title=str(r.get("title") or ""),
        companyName=str(r.get("company_name") or ""),
        location=str(r.get("location") or ""),
        status=str(r.get("status") or "open"),
        salary=int(r.get("salary_monthly_pkr") or r.get("salary") or 0),
        cvWeight=int(r.get("cv_score_weightage") or 50),
        videoWeight=int(r.get("video_score_weightage") or 50),
        applicantCount=applicant_counts.get(jid, 0),
      )
    )
  return jobs


class CreateJobPayload(BaseModel):
  title: str
  companyName: str
  branchName: str
  location: str
  skills: list[str] = []
  minExperience: int
  otherRequirements: str | None = None
  workMode: list[str] = []  # e.g. ["Onsite"] or ["Remote"]
  salary: int
  cvWeight: int
  videoWeight: int
  questions: list[str] = []


@router.post("/jobs", response_model=RecruiterJob, status_code=status.HTTP_201_CREATED)
async def create_recruiter_job(
  payload: CreateJobPayload,
  recruiter_id: int = Query(..., description="Recruiter ID creating the job"),
  pool: asyncpg.Pool = Depends(get_db_pool),
):
  """Create a new job from recruiter Add Job form.
  
  recruiter_id is required and must be provided as a query parameter.
  """
  # Verify recruiter exists
  async with pool.acquire() as conn:
    recruiter_check = await conn.fetchrow(
      "SELECT recruiter_id FROM recruiters WHERE recruiter_id = $1;",
      recruiter_id,
    )
    if not recruiter_check:
      raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruiter not found")

  # Map workMode from UI ("Onsite"/"Remote") to DB enum ("ONSITE"/"REMOTE")
  work_mode = "REMOTE"
  if "Onsite" in payload.workMode:
    work_mode = "ONSITE"

  print(f"create_recruiter_job: Creating job for recruiter_id={recruiter_id}")  # Debug logging

  try:
    row = await job_repo.create_job(
      pool,
      recruiter_id=recruiter_id,
      job_title=payload.title,
      company_name=payload.companyName,
      branch_name=payload.branchName,
      job_description=payload.otherRequirements or "",
      location=payload.location,
      work_mode=work_mode,
      salary_monthly_pkr=payload.salary,
      minimum_experience_years=payload.minExperience,
      skills=payload.skills,
      other_requirements=payload.otherRequirements or "",
      cv_score_weightage=payload.cvWeight,
      video_score_weightage=payload.videoWeight,
    )
  except ValueError as exc:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

  # Store job-specific video questions linked to this job.
  await job_repo.insert_job_questions(
    pool,
    job_id=int(row["job_id"]),
    questions=payload.questions,
  )

  return RecruiterJob(
    id=str(row["job_id"]),
    title=row["job_title"],
    companyName=row.get("company_name") or "",
    location=row["location"],
    status=row["status"],
    salary=row.get("salary_monthly_pkr") or 0,
    cvWeight=row["cv_score_weightage"],
    videoWeight=row["video_score_weightage"],
    applicantCount=0,
  )


@router.get("/jobs/{job_id}", response_model=dict)
async def get_job(
  job_id: int,
  pool: asyncpg.Pool = Depends(get_db_pool),
):
  """Get a single job by ID with all details including questions."""
  job = await job_repo.get_job_by_id(pool, job_id=job_id)
  if not job:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
  return job


class JobApplicantResponse(BaseModel):
  application_id: int
  candidate_id: int
  job_id: int
  status: str
  candidate_name: str
  cv_score: int | None
  video_score: int | None
  total_score: int | None


@router.get("/jobs/{job_id}/applicants", response_model=list[JobApplicantResponse])
async def list_job_applicants(
  job_id: int,
  pool: asyncpg.Pool = Depends(get_db_pool),
):
  """List applicants for a job with cv_score, video_score, total_score from ai_assessments."""
  # Verify job exists
  job = await job_repo.get_job_by_id(pool, job_id=job_id)
  if not job:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
  rows = await application_repo.list_applications_for_job(pool, job_id=job_id)
  return [
    JobApplicantResponse(
      application_id=r["application_id"],
      candidate_id=r["candidate_id"],
      job_id=r["job_id"],
      status=r["status"],
      candidate_name=r["candidate_name"],
      cv_score=r["cv_score"],
      video_score=r["video_score"],
      total_score=r["total_score"],
    )
    for r in rows
  ]


class UpdateJobPayload(BaseModel):
  title: str
  companyName: str
  branchName: str
  location: str
  skills: list[str] = []
  minExperience: int
  otherRequirements: str | None = None
  workMode: list[str] = []  # e.g. ["Onsite"] or ["Remote"]
  salary: int
  cvWeight: int
  videoWeight: int
  questions: list[str] = []


@router.put("/jobs/{job_id}", response_model=RecruiterJob)
async def update_recruiter_job(
  job_id: int,
  payload: UpdateJobPayload,
  pool: asyncpg.Pool = Depends(get_db_pool),
):
  """Update an existing job."""
  # Map workMode from UI ("Onsite"/"Remote") to DB enum ("ONSITE"/"REMOTE")
  work_mode = "REMOTE"
  if "Onsite" in payload.workMode:
    work_mode = "ONSITE"
  
  try:
    row = await job_repo.update_job(
      pool,
      job_id=job_id,
      job_title=payload.title,
      company_name=payload.companyName,
      branch_name=payload.branchName,
      location=payload.location,
      work_mode=work_mode,
      salary_monthly_pkr=payload.salary,
      minimum_experience_years=payload.minExperience,
      skills=payload.skills,
      other_requirements=payload.otherRequirements or "",
      cv_score_weightage=payload.cvWeight,
      video_score_weightage=payload.videoWeight,
    )
  except ValueError as exc:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
  
  if not row:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
  
  # Update job questions
  await job_repo.update_job_questions(
    pool,
    job_id=job_id,
    questions=payload.questions,
  )
  
  return RecruiterJob(
    id=str(row["job_id"]),
    title=row["job_title"],
    companyName=row.get("company_name") or "",
    location=row["location"],
    status=row["status"],
    salary=row.get("salary_monthly_pkr") or 0,
    cvWeight=row["cv_score_weightage"],
    videoWeight=row["video_score_weightage"],
    applicantCount=0,
  )


class UpdateJobStatusPayload(BaseModel):
  status: str  # "open" or "closed"


@router.patch("/jobs/{job_id}/status", response_model=RecruiterJob)
async def update_job_status(
  job_id: int,
  payload: UpdateJobStatusPayload,
  pool: asyncpg.Pool = Depends(get_db_pool),
):
  """Update the status of a job (open/closed)."""
  if payload.status not in ("open", "closed"):
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Status must be 'open' or 'closed'"
    )
  
  try:
    row = await job_repo.update_job_status(pool, job_id=job_id, status=payload.status)
  except ValueError as exc:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
  
  if not row:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
  
  return RecruiterJob(
    id=str(row["job_id"]),
    title=row["job_title"],
    companyName=row.get("company_name") or "",
    location=row["location"],
    status=row["status"],
    salary=row.get("salary_monthly_pkr") or 0,
    cvWeight=row["cv_score_weightage"],
    videoWeight=row["video_score_weightage"],
    applicantCount=0,
  )


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recruiter_job(
  job_id: int,
  pool: asyncpg.Pool = Depends(get_db_pool),
):
  """Delete a job and its associated questions.
  
  Due to CASCADE delete on job_questions relation, deleting a job
  will automatically delete all associated questions from the job_questions table.
  """
  ok = await job_repo.delete_job(pool, job_id=job_id)
  if not ok:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
  return


class RecruiterListItem(BaseModel):
  id: int
  name: str
  email: EmailStr
  employeeId: str | None = None
  role: str
  status: str
  joinedDate: str
  jobsPosted: int = 0
  totalApplicants: int = 0


@router.get("/company-recruiters", response_model=list[RecruiterListItem])
async def list_company_recruiters(
  company_name: str,
  pool: asyncpg.Pool = Depends(get_db_pool),
):
  """List recruiters for a company by name (used in CompanyRecruiters dashboard)."""
  rows = await recruiter_repo.list_recruiters_for_company(pool, company_name=company_name)
  items: list[RecruiterListItem] = []
  for r in rows:
    items.append(
      RecruiterListItem(
        id=r["recruiter_id"],
        name=r["full_name"],
        email=r["email"],
        employeeId=r.get("employee_id"),
        role=r.get("role") or "Recruiter",
        status=r.get("status") or "pending",
        joinedDate=r["created_at"].date().isoformat(),
        jobsPosted=0,
        totalApplicants=0,
      )
    )
  return items


@router.post("/{recruiter_id}/approve", response_model=RecruiterPublic)
async def approve_recruiter(
  recruiter_id: int,
  pool: asyncpg.Pool = Depends(get_db_pool),
):
  row = await recruiter_repo.update_recruiter_status(pool, recruiter_id=recruiter_id, status="approved")
  if not row:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruiter not found")
  return RecruiterPublic(
    recruiterId=row["recruiter_id"],
    fullName=row["full_name"],
    email=row["email"],
    status=row["status"],
  )


@router.post("/{recruiter_id}/disable", response_model=RecruiterPublic)
async def disable_recruiter(
  recruiter_id: int,
  pool: asyncpg.Pool = Depends(get_db_pool),
):
  row = await recruiter_repo.update_recruiter_status(pool, recruiter_id=recruiter_id, status="disabled")
  if not row:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruiter not found")
  return RecruiterPublic(
    recruiterId=row["recruiter_id"],
    fullName=row["full_name"],
    email=row["email"],
    status=row["status"],
  )


@router.delete("/{recruiter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recruiter(
  recruiter_id: int,
  pool: asyncpg.Pool = Depends(get_db_pool),
):
  ok = await recruiter_repo.delete_recruiter(pool, recruiter_id=recruiter_id)
  if not ok:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recruiter not found")
  return

