# ✅ COMPLETED

# 02 — Input Validation

## Summary

Multiple endpoints accept user input without proper validation, creating opportunities for denial of service, data corruption, and injection attacks. The schemas layer (`schemas/requests.py`) lacks constraints, and routers perform minimal or incorrect validation.

---

## Issues

### 1. PDF Upload — Extension-Only Check (No Content Validation)

**File:** `routers/cv.py` (lines 58–66)

```python
if not file.filename.lower().endswith(".pdf"):
    return JSONResponse({"error": "Only PDFs are supported."}, status_code=400)

content = await file.read()
storage_filename = f"{uuid.uuid4()}.pdf"
with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
    tmp.write(content)
    temp_path = tmp.name
```

**Impact:** A malicious file (e.g., a script, executable, or malformed binary) named `malware.pdf` passes validation. This could lead to:

- Server-side processing errors in `pdfplumber`
- Potential RCE if PDF parser has vulnerabilities
- Storage of non-PDF content masquerading as PDFs

**Recommended Fix:**

```python
import magic  # python-magic library

ALLOWED_MIME = "application/pdf"
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

content = await file.read()

# Size check
if len(content) > MAX_FILE_SIZE:
    raise HTTPException(status_code=413, detail="File too large. Max 10MB.")

# Magic bytes check
mime = magic.from_buffer(content[:2048], mime=True)
if mime != ALLOWED_MIME:
    raise HTTPException(status_code=400, detail="File is not a valid PDF.")

# Extension check (secondary)
if not file.filename.lower().endswith(".pdf"):
    raise HTTPException(status_code=400, detail="File must have .pdf extension.")
```

---

### 2. No Maximum Length on Cover Letter

**File:** `schemas/requests.py` (lines 11–14)

```python
class SubmitApplicationRequest(BaseModel):
    user_id: str
    internship_id: str
    cover_letter: str
    student_email: str = ""
```

**Impact:** A client can submit a cover letter with unlimited size (megabytes of text). This:

- Bloats the database
- Causes timeout when sent to LLM for analysis
- May crash the streaming endpoint
- Could be used as a DoS vector

**Recommended Fix:**

```python
from pydantic import Field

class SubmitApplicationRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=128)
    internship_id: str = Field(..., min_length=1, max_length=128)
    cover_letter: str = Field(..., min_length=10, max_length=5000)
    student_email: str = Field(default="", max_length=254)
```

---

### 3. No Maximum Length on Logbook Raw Text

**File:** `routers/logbook.py` (lines 18–21)

```python
@router.post("/api/logbook/enhance")
async def enhance_entry(payload: EnhanceRequest, current_user = Depends(get_current_user)):
    if not payload.raw_text.strip():
        raise HTTPException(status_code=400, detail="Raw text cannot be empty.")
```

**Impact:** Only checks for empty text, no upper bound. A user could submit an entire book, overwhelming the LLM service and database storage.

**Recommended Fix:**

In `schemas/requests.py`:

```python
class EnhanceRequest(BaseModel):
    raw_text: str = Field(..., min_length=1, max_length=10000)
```

In the router (defense in depth):

```python
if len(payload.raw_text) > 10000:
    raise HTTPException(status_code=400, detail="Text too long. Maximum 10,000 characters.")
```

---

### 4. Unbounded Admin Search Query String

**File:** `routers/admin.py` (lines 98–105)

```python
async def search_platform(q: str = Query(...), current_user = Depends(verify_admin)):
    tasks = [
        asyncio.to_thread(lambda: supabase.table("internships").select("*")
            .or_(f"role.ilike.%{q}%,company.ilike.%{q}%").limit(5).execute()),
        asyncio.to_thread(lambda: supabase.table("profiles").select("*")
            .or_(f"full_name.ilike.%{q}%,company_name.ilike.%{q}%").limit(5).execute())
    ]
```

**Impact:**

- No `max_length` on `q`: a multi-megabyte query string causes database timeout
- The query is interpolated directly into a PostgREST filter string — potential for PostgREST filter injection
- Special characters (`%`, `_`, `*`) in `q` are not escaped, affecting ILIKE behavior

**Recommended Fix:**

```python
from fastapi import Query as QueryParam

async def search_platform(
    q: str = QueryParam(..., min_length=1, max_length=100),
    current_user = Depends(verify_admin)
):
    # Escape ILIKE special characters
    safe_q = q.replace("%", "\\%").replace("_", "\\_")
    ...
```

---

### 5. No UUID Format Validation on Path Parameters

**File:** `routers/analysis.py` (lines 48–65), `routers/applications.py`, `routers/cv.py`

```python
@router.get("/api/analysis/skill-gap")
async def get_skill_gap_analysis(
    internship_id: str, current_user=Depends(get_current_user)
):
    # No format check — any string accepted
    res = supabase.table("internships").select("role, requirements").eq("id", internship_id).single().execute()
```

**Impact:** Invalid IDs (e.g., SQL fragments, very long strings, special characters) are passed directly to Supabase queries. While PostgREST is generally safe from SQL injection, malformed UUIDs cause unnecessary database round-trips and unclear error messages.

**Recommended Fix:**

```python
import uuid as uuid_lib

def validate_uuid(value: str) -> str:
    try:
        uuid_lib.UUID(value)
        return value
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format. Expected UUID.")

@router.get("/api/analysis/skill-gap")
async def get_skill_gap_analysis(
    internship_id: str = Query(...),
    current_user=Depends(get_current_user)
):
    validate_uuid(internship_id)
    ...
```

Or use Pydantic's `UUID4` type in schemas.

---

### 6. Weak Employer ID Validation

**File:** `routers/profiles.py` (lines 26–29)

```python
@router.get("/api/companies/{employer_id}")
def get_company_profile(employer_id: str):
    if employer_id == "undefined" or not employer_id:
        raise HTTPException(status_code=400, detail="Invalid employer ID")
```

**Impact:** Only rejects the literal string `"undefined"` and empty strings. This is a client-bug workaround, not real validation. Strings like `"null"`, `"NaN"`, or `"<script>alert(1)</script>"` pass through.

**Recommended Fix:**

```python
@router.get("/api/companies/{employer_id}")
def get_company_profile(employer_id: str):
    try:
        uuid_lib.UUID(employer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid employer ID format.")
    ...
```

---

### 7. No File Size Limit on PDF Upload

**File:** `routers/cv.py` (line 58)

```python
content = await file.read()  # Reads entire file into memory
```

**Impact:** No size limit means a user can upload a 1GB file. This:

- Exhausts server memory
- Causes timeout during processing
- Fills up temp disk space
- Could be used as a DoS vector

**Recommended Fix:**

```python
MAX_CV_SIZE = 5 * 1024 * 1024  # 5 MB

content = await file.read()
if len(content) > MAX_CV_SIZE:
    raise HTTPException(status_code=413, detail="CV file too large. Maximum 5MB.")
```

For production, also configure at the reverse proxy level (nginx `client_max_body_size`).

---

### 8. No Validation on Application Status Values

**File:** `routers/applications.py` (lines 141–145)

```python
@router.put("/applications/{app_id}/status")
def update_status(app_id: str, payload: ApplicationStatusUpdate, current_user = Depends(get_current_user)):
    supabase.table("applied_internships").update({"status": payload.status}).eq("id", app_id).execute()
```

**Impact:** If `ApplicationStatusUpdate` doesn't constrain `status` to valid values, any string (including empty, very long, or XSS payloads) is stored in the database.

**Recommended Fix:**

```python
from enum import Enum

class ApplicationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"

class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
```

---

## Priority

| #   | Issue                              | Severity | Effort |
| --- | ---------------------------------- | -------- | ------ |
| 1   | PDF content validation             | High     | Low    |
| 2   | Cover letter max length            | Medium   | Low    |
| 3   | Logbook text max length            | Medium   | Low    |
| 4   | Admin search unbounded + injection | High     | Low    |
| 5   | UUID format validation             | Medium   | Low    |
| 6   | Employer ID validation             | Medium   | Low    |
| 7   | File size limit                    | High     | Low    |
| 8   | Status enum validation             | Medium   | Low    |
