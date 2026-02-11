"""Pydantic models for candidate-related API responses."""
from pydantic import BaseModel


class CandidateOverview(BaseModel):
    """Candidate overview (e.g. from CV)."""
    name: str
    phone: str
    email: str
    address: str


class CandidateRow(BaseModel):
    """Single candidate row from DB."""
    candidate_id: int
    full_name: str | None
    email: str | None
    phone: str | None
    address: str | None
