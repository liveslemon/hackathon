from enum import Enum
from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=128)


class AnalyzeNewInternshipRequest(BaseModel):
    internship_id: str = Field(..., min_length=1, max_length=128)


class DraftCoverLetterRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=128)
    internship_id: str = Field(..., min_length=1, max_length=128)
    existing_letter: str = Field(default="", max_length=10000)


class SubmitApplicationRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=128)
    internship_id: str = Field(..., min_length=1, max_length=128)
    cover_letter: str = Field(..., min_length=10, max_length=5000)
    student_email: str = Field(default="", max_length=254)


class ApplicationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
