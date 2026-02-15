"""API endpoints for company sign-up and login."""
import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr

from repositories import company_repo, job_repo, application_repo

router = APIRouter(prefix="/company", tags=["company"])


async def get_db_pool(request: Request) -> asyncpg.Pool:
  return request.app.state.db_pool


class CompanySignUpPayload(BaseModel):
  """Payload coming from the frontend CompanySignUp form (camelCase fields)."""

  companyName: str
  companyDescription: str
  industry: str
  websiteUrl: str | None = None
  contactEmail: EmailStr
  contactPersonName: str
  contactPhone: str
  password: str


class CompanyLoginPayload(BaseModel):
  email: EmailStr
  password: str


class CompanyPublic(BaseModel):
  companyId: int
  companyName: str
  contactEmail: EmailStr


class CompanyProfileResponse(BaseModel):
  """Company profile for the dashboard header (from companies table)."""
  companyName: str
  companyDescription: str
  industry: str
  websiteUrl: str | None


@router.post("/signup", response_model=CompanyPublic, status_code=status.HTTP_201_CREATED)
async def company_signup(
  payload: CompanySignUpPayload,
  pool: asyncpg.Pool = Depends(get_db_pool),
):
  """Create a new company account."""
  try:
    row = await company_repo.create_company(
      pool,
      company_name=payload.companyName,
      company_description=payload.companyDescription,
      industry=payload.industry,
      website_url=payload.websiteUrl,
      contact_email=str(payload.contactEmail),
      contact_person_name=payload.contactPersonName,
      contact_phone=payload.contactPhone,
      password=payload.password,
    )
  except ValueError as exc:
    # Likely duplicate email or validation issue in repo
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

  return CompanyPublic(
    companyId=row["company_id"],
    companyName=row["company_name"],
    contactEmail=row["contact_email"],
  )


@router.post("/login", response_model=CompanyPublic)
async def company_login(
  payload: CompanyLoginPayload,
  pool: asyncpg.Pool = Depends(get_db_pool),
):
  """Authenticate a company by email + password."""
  result = await company_repo.authenticate_company(
    pool,
    email=str(payload.email),
    password=payload.password,
  )
  if not result:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Invalid email or password",
    )

  return CompanyPublic(
    companyId=result["company_id"],
    companyName=result["company_name"],
    contactEmail=result["contact_email"],
  )


@router.get("/profile", response_model=CompanyProfileResponse | None)
async def get_company_profile(
  company_name: str,
  pool: asyncpg.Pool = Depends(get_db_pool),
):
  """Get company profile by name for the Company Dashboard header."""
  row = await company_repo.get_company_profile_by_name(pool, company_name=company_name)
  if not row:
    return None
  return CompanyProfileResponse(
    companyName=row["company_name"] or "",
    companyDescription=row["company_description"] or "",
    industry=row["industry"] or "",
    websiteUrl=row.get("website_url"),
  )


@router.get("/jobs")
async def list_company_jobs(
  company_name: str,
  pool: asyncpg.Pool = Depends(get_db_pool),
):
  """List jobs posted by recruiters belonging to this company. Jobs only (no applicant counts)."""
  rows = await job_repo.list_jobs_for_company(pool, company_name=company_name)
  return {"jobs": rows}


@router.get("/jobs-with-applicant-counts")
async def list_company_jobs_with_applicant_counts(
  company_name: str,
  pool: asyncpg.Pool = Depends(get_db_pool),
):
  """List jobs for this company with applicant count per job (for Applicants Overview)."""
  jobs = await job_repo.list_jobs_for_company(pool, company_name=company_name)
  if not jobs:
    return {"jobs": []}
  job_ids = [int(j["id"]) for j in jobs]
  counts = await application_repo.count_applications_by_job(pool, job_ids=job_ids)
  for j in jobs:
    j["applicant_count"] = counts.get(int(j["id"]), 0)
  return {"jobs": jobs}


class CompanyAnalyticsResponse(BaseModel):
  total_jobs: int
  jobs_open: int
  jobs_closed: int
  total_applicants: int
  total_recruiters: int
  recruiters_approved: int
  recruiters_pending: int
  avg_applicants_per_job: float
  applicants_per_recruiter: list[dict]
  job_status_distribution: list[dict]
  monthly_trends: list[dict]


@router.get("/analytics", response_model=CompanyAnalyticsResponse)
async def get_company_analytics(
  company_name: str,
  pool: asyncpg.Pool = Depends(get_db_pool),
):
  """Get company-wide analytics for the Overview dashboard (stats and chart data)."""
  data = await company_repo.get_company_analytics(pool, company_name=company_name)
  return CompanyAnalyticsResponse(**data)

