# ✅ COMPLETED

# 06 — API Design Consistency

## Summary

The API has inconsistent response formats, non-standard endpoint naming, missing standard endpoints (health check), and mixed patterns that make it difficult for frontend developers to consume reliably.

---

## Issues

### 1. Inconsistent Response Wrapper Keys

**Files:** `routers/applications.py`, `routers/admin.py`

```python
# get_applicants returns:
{"applicants": [...]}

# get_student_applications returns:
{"applications": [...]}

# admin stats returns flat keys:
{"total_students": 5, "total_internships": 10, "total_applications": 20}

# admin analytics wraps with nesting:
{"total_internships": 10, "total_applications": 5, "internship_stats": [...]}

# admin directory returns raw array:
[{...}, {...}, {...}]
```

**Impact:**

- Frontend must handle different response shapes per endpoint
- No consistent pattern for extracting data
- Hard to write generic API client utilities
- Array responses are not extensible (can't add pagination metadata later)

**Recommended Fix:**

Standardize all list responses:

```python
# Standard list response
{
    "data": [...],
    "meta": {
        "total": 100,
        "page": 1,
        "page_size": 25
    }
}

# Standard single-item response
{
    "data": {...}
}

# Standard success response (mutations)
{
    "success": true,
    "message": "Application submitted successfully"
}
```

---

### 2. Mixed JSONResponse vs Dict Returns

**Files:** `routers/cv.py`, `routers/applications.py`

```python
# Pattern A: JSONResponse for errors
return JSONResponse({"error": "Only PDFs are supported."}, status_code=400)

# Pattern B: Dict return for success
return {"cv_url": cv_url}

# Pattern C: JSONResponse for success (admin.py)
return JSONResponse({"error": str(e)}, status_code=500)
```

**Impact:**

- `JSONResponse` bypasses FastAPI's response model validation
- Cannot use `response_model` parameter for auto-documentation
- OpenAPI schema incomplete — Swagger UI doesn't show error responses
- Different serialization behavior (datetime handling, etc.)

**Recommended Fix:**

Use `HTTPException` for all errors and dict/Pydantic model returns for success:

```python
# Errors: always HTTPException
raise HTTPException(status_code=400, detail="Only PDFs are supported.")

# Success: always dict or response model
@router.post("/api/cv/upload", response_model=CVUploadResponse)
async def upload_cv(...):
    ...
    return {"cv_url": url, "success": True}
```

---

### 3. Inconsistent URL Patterns

**Files:** All routers

```python
# Pattern A: /api/ prefix
@router.get("/api/analysis/skill-gap")
@router.post("/api/logbook/enhance")
@router.get("/api/companies/{employer_id}")

# Pattern B: No prefix
@router.get("/applications/student")
@router.put("/applications/{app_id}/status")

# Pattern C: /admin/ prefix
@router.get("/admin/stats")
@router.get("/admin/directory")

# Pattern D: /debug/ prefix
@router.get("/debug/match-results/{user_id}")
```

**Impact:**

- No clear convention for API versioning
- Some routes use `/api/` prefix, others don't
- Harder to set up reverse proxy rules
- Confusing for API consumers

**Recommended Fix:**

Standardize all routes under `/api/v1/`:

```python
# main.py
from fastapi import APIRouter

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(applications_router, prefix="/applications", tags=["Applications"])
api_router.include_router(cv_router, prefix="/cv", tags=["CV"])
api_router.include_router(logbook_router, prefix="/logbook", tags=["Logbook"])
api_router.include_router(admin_router, prefix="/admin", tags=["Admin"])
api_router.include_router(analysis_router, prefix="/analysis", tags=["Analysis"])

app.include_router(api_router)
```

Results in:

- `GET /api/v1/applications/student`
- `POST /api/v1/cv/upload`
- `GET /api/v1/admin/stats`

---

### 4. Missing Health Check Endpoint

**File:** `main.py` — no `/health` or `/ready` endpoint exists.

**Impact:**

- Load balancers (AWS ALB, nginx) cannot check if the service is healthy
- Container orchestrators (Docker, Kubernetes) cannot determine readiness
- No way to verify database connectivity without hitting a business endpoint
- Deployment rollbacks cannot detect unhealthy instances

**Recommended Fix:**

```python
# routers/system.py
@router.get("/health")
async def health_check():
    """Lightweight liveness probe."""
    return {"status": "healthy"}

@router.get("/ready")
async def readiness_check():
    """Checks all dependencies are available."""
    checks = {}

    # Check Supabase
    try:
        supabase.table("profiles").select("id").limit(1).execute()
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "unavailable"

    # Check Redis (if configured)
    try:
        if redis_client:
            redis_client.ping()
            checks["cache"] = "ok"
        else:
            checks["cache"] = "not_configured"
    except Exception:
        checks["cache"] = "unavailable"

    all_ok = all(v == "ok" for v in checks.values() if v != "not_configured")
    status_code = 200 if all_ok else 503

    return JSONResponse(
        {"status": "ready" if all_ok else "degraded", "checks": checks},
        status_code=status_code
    )
```

---

### 5. No OpenAPI Documentation Enhancement

**File:** `main.py`

```python
app = FastAPI()
```

**Impact:**

- No API title, description, or version in Swagger UI
- No tags for grouping endpoints
- No response model documentation
- Auto-generated docs are bare and unhelpful

**Recommended Fix:**

```python
app = FastAPI(
    title="InternMatch API",
    description="AI-powered internship matching platform backend",
    version="4.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
)
```

Add response models:

```python
# schemas/responses.py
from pydantic import BaseModel

class PaginatedResponse(BaseModel):
    data: list
    meta: dict

class ApplicationResponse(BaseModel):
    id: str
    status: str
    match_score: float | None
    internship: dict

# In router
@router.get("/applications/student", response_model=PaginatedResponse)
```

---

### 6. No Consistent Date/Time Format

**Files:** Various — dates returned as-is from Supabase.

**Impact:** Different tables may store dates in different formats (ISO 8601, Unix timestamps, date-only). Without normalization, the frontend must handle multiple formats.

**Recommended Fix:**

Add a response serializer or use Pydantic models that enforce ISO 8601:

```python
from datetime import datetime
from pydantic import BaseModel

class LogbookEntry(BaseModel):
    id: str
    date: datetime  # Auto-serializes to ISO 8601
    content: str
    status: str

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
```

---

### 7. Inconsistent Success/Error Response for Mutations

**Files:** `routers/applications.py`

```python
# Some mutations return success:
return {"success": True}

# Some return success with message:
return {"success": True, "message": "Already applied."}

# Some return the created resource:
return {"application_id": app_id}

# Some return nothing useful:
return {"ok": True}
```

**Impact:** Frontend cannot use a single pattern to handle mutation responses.

**Recommended Fix:**

```python
# Standard mutation response
class MutationResponse(BaseModel):
    success: bool
    message: str | None = None
    data: dict | None = None  # Created/updated resource

# Usage
return MutationResponse(success=True, message="Application submitted", data={"id": app_id})
```

---

### 8. No API Versioning Strategy

**Impact:** When breaking changes are needed, there's no way to maintain backward compatibility. All clients must update simultaneously.

**Recommended Fix:**

Use URL-based versioning:

```
/api/v1/applications  ← current
/api/v2/applications  ← future breaking changes
```

Or header-based:

```
Accept: application/vnd.internmatch.v1+json
```

---

## Priority

| #   | Issue                           | Severity | Effort |
| --- | ------------------------------- | -------- | ------ |
| 1   | Inconsistent wrapper keys       | Medium   | Medium |
| 2   | Mixed response types            | Medium   | Medium |
| 3   | Inconsistent URL patterns       | Medium   | High   |
| 4   | Missing health check            | High     | Low    |
| 5   | No OpenAPI docs                 | Low      | Low    |
| 6   | Date format inconsistency       | Low      | Medium |
| 7   | Mutation response inconsistency | Medium   | Low    |
| 8   | No API versioning               | Low      | High   |
