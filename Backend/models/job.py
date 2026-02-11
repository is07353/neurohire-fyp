"""Pydantic models for job-related API responses."""
from pydantic import BaseModel


class JobForCandidate(BaseModel):
    """Job as returned to candidate (job selection list)."""
    id: str
    title: str
    company_name: str
    branch_name: str
    job_description: str | None
    eligibility_text: str | None
    status: str
    location: str
    type: str
    minExperience: int
    skills: list[str]
    workMode: list[str]
    salary: int
    otherRequirements: str
    cv_score_weightage: int
    video_score_weightage: int
