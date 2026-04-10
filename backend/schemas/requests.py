from pydantic import BaseModel

class AnalyzeRequest(BaseModel):
    user_id: str

class AnalyzeNewInternshipRequest(BaseModel):
    internship_id: str

class DraftCoverLetterRequest(BaseModel):
    user_id: str
    internship_id: str
    existing_letter: str = ""

class SubmitApplicationRequest(BaseModel):
    user_id: str
    internship_id: str
    cover_letter: str
    student_email: str = ""

class ApplicationStatusUpdate(BaseModel):
    status: str
