"""API endpoints for company sign-up and login."""
import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr

from repositories import company_repo, job_repo

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


@router.get("/jobs")
async def list_company_jobs(
  company_name: str,
  pool: asyncpg.Pool = Depends(get_db_pool),
):
  """List jobs posted by recruiters belonging to this company. Jobs only (no applicant counts)."""
  rows = await job_repo.list_jobs_for_company(pool, company_name=company_name)
  return {"jobs": rows}

