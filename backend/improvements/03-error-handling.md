# ✅ COMPLETED

# 03 — Error Handling

## Summary

The backend has inconsistent error handling that exposes internal details to clients, uses incorrect HTTP status codes, and mixes different response formats. This makes the API harder to consume, harder to debug, and less secure.

---

## Issues

### 1. Internal Exception Details Exposed to Clients

**Files:** `routers/admin.py` (lines 32–35), `routers/applications.py` (lines 141–145), `routers/cv.py`

```python
# admin.py
except Exception as e:
    logger.error(f"Error fetching admin stats: {e}")
    return JSONResponse({"error": str(e)}, status_code=500)

# applications.py
except Exception as e:
    return JSONResponse({"error": str(e)}, status_code=500)
```

**Impact:** `str(e)` can contain:

- Database connection strings
- Table/column names revealing schema
- Stack traces with file paths
- Third-party API error details with keys

Attackers use this information for reconnaissance.

**Recommended Fix:**

```python
import traceback

except Exception as e:
    logger.error(f"Error fetching admin stats: {e}", exc_info=True)
    return JSONResponse(
        {"error": "An internal error occurred. Please try again later."},
        status_code=500
    )
```

For development, add a debug mode:

```python
if settings.DEBUG:
    return JSONResponse({"error": str(e), "traceback": traceback.format_exc()}, status_code=500)
return JSONResponse({"error": "Internal server error"}, status_code=500)
```

---

### 2. All Errors Return HTTP 500

**File:** `routers/applications.py` (lines 141–145)

```python
@router.put("/applications/{app_id}/status")
def update_status(app_id: str, payload: ApplicationStatusUpdate, current_user = Depends(get_current_user)):
    try:
        supabase.table("applied_internships").update({"status": payload.status}).eq("id", app_id).execute()
        return {"success": True}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
```

**Impact:** Client cannot distinguish between:

- 404: Application not found
- 403: Not authorized to update
- 400: Invalid status value
- 409: Conflict (already in that status)
- 500: Actual server error

All are returned as 500, making client-side error handling impossible.

**Recommended Fix:**

```python
from supabase.lib.client_options import PostgrestAPIError

@router.put("/applications/{app_id}/status")
def update_status(app_id: str, payload: ApplicationStatusUpdate, current_user = Depends(get_current_user)):
    # Fetch and validate
    app = supabase.table("applied_internships").select("*").eq("id", app_id).maybe_single().execute()
    if not app.data:
        raise HTTPException(status_code=404, detail="Application not found")

    # Authorization check
    if not is_authorized(current_user, app.data):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Perform update
    try:
        supabase.table("applied_internships").update({"status": payload.status}).eq("id", app_id).execute()
        return {"success": True}
    except Exception as e:
        logger.error(f"Failed to update application {app_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update application status")
```

---

### 3. Wrong HTTP Status Codes for Dependency Failures

**File:** `routers/analysis.py` (lines 68–70)

```python
except json.JSONDecodeError as e:
    logger.error(f"LLM JSON Error: {e}")
    raise HTTPException(status_code=500, detail="AI returned invalid formatting.")
```

**Impact:** HTTP 500 implies the server is broken. When an external dependency (LLM) fails, the correct code is:

- **424 Failed Dependency** — upstream service returned invalid data
- **502 Bad Gateway** — if acting as proxy to LLM
- **503 Service Unavailable** — if the service is temporarily down

Correct status codes allow clients to implement appropriate retry strategies.

**Recommended Fix:**

```python
except json.JSONDecodeError as e:
    logger.error(f"LLM returned unparseable response: {e}")
    raise HTTPException(
        status_code=502,
        detail="AI service returned an invalid response. Please try again."
    )
```

---

### 4. Mixed Response Formats: JSONResponse vs HTTPException

**Files:** Multiple routers

```python
# Pattern A: JSONResponse (routers/cv.py)
return JSONResponse({"error": "Only PDFs are supported."}, status_code=400)

# Pattern B: HTTPException (routers/logbook.py)
raise HTTPException(status_code=400, detail="Raw text cannot be empty.")

# Pattern C: Dict return for errors (routers/applications.py)
return {"success": False, "message": "Already applied."}
```

**Impact:**

- Clients must handle three different error shapes
- `JSONResponse` bypasses FastAPI's exception handlers
- `HTTPException` uses `{"detail": "..."}` format
- Dict returns use `{"error": "..."}` or `{"message": "..."}`

**Recommended Fix:**

Standardize on `HTTPException` for all errors and create a custom exception handler:

```python
# core/exceptions.py
from fastapi import Request
from fastapi.responses import JSONResponse

class AppException(Exception):
    def __init__(self, status_code: int, message: str, code: str = None):
        self.status_code = status_code
        self.message = message
        self.code = code

async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "message": exc.message,
                "code": exc.code,
            }
        }
    )

# main.py
app.add_exception_handler(AppException, app_exception_handler)
```

---

### 5. Generic Exception Catching Masks Auth Failures

**File:** `core/security.py` (lines 9–24)

```python
async def get_current_user(token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    try:
        res = supabase.auth.get_user(token.credentials)
        if not res or not res.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token.")
        return res.user
    except Exception as e:
        logger.error(f"[Auth] Token verification failed: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed.")
```

**Impact:** All exceptions (network errors, Supabase outages, malformed tokens) return the same 401. This:

- Makes debugging impossible without logs
- Hides service outages behind "auth failed"
- Could mean database is down but user sees "invalid token"

**Recommended Fix:**

```python
from supabase.lib.client_options import AuthApiError

async def get_current_user(token: HTTPAuthorizationCredentials = Depends(auth_scheme)):
    try:
        res = supabase.auth.get_user(token.credentials)
        if not res or not res.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token.")
        return res.user
    except HTTPException:
        raise  # Re-raise our own exceptions
    except AuthApiError as e:
        logger.warning(f"[Auth] Invalid token: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    except Exception as e:
        logger.error(f"[Auth] Service error during authentication: {e}", exc_info=True)
        raise HTTPException(status_code=503, detail="Authentication service unavailable.")
```

---

### 6. Background Task Failures Are Silent

**File:** `routers/cv.py` (lines 27–44)

```python
async def process_matches_in_background(user_id: str, cv_text: str, internships: list):
    try:
        # ... compute matches, store results
    except Exception as e:
        logger.error(f"Background match processing failed for user {user_id}: {e}")
        # User is never notified
```

**Impact:** The user uploads a CV, gets a success response, but matching never completes. They see stale or empty match results with no indication of failure.

**Recommended Fix:**

```python
async def process_matches_in_background(user_id: str, cv_text: str, internships: list):
    try:
        # ... compute matches
    except Exception as e:
        logger.error(f"Background match processing failed for user {user_id}: {e}", exc_info=True)
        # Record failure state
        supabase.table("profiles").update({
            "match_status": "failed",
            "match_error": "Processing failed. Please re-upload your CV."
        }).eq("id", user_id).execute()
```

---

### 7. No Global Exception Handler

**File:** `main.py`

**Impact:** Unhandled exceptions in routes without try/except blocks return FastAPI's default 500 response with a generic "Internal Server Error" message. There's no logging, no request ID, and no structured error format.

**Recommended Fix:**

```python
# main.py
from fastapi import Request
from fastapi.responses import JSONResponse
import uuid as uuid_lib

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_id = str(uuid_lib.uuid4())[:8]
    logger.error(f"Unhandled error [{error_id}]: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "message": "An unexpected error occurred.",
                "reference": error_id,  # User can report this ID
            }
        }
    )
```

---

## Standardized Error Response Schema

All errors should follow one format:

```json
{
  "error": {
    "message": "Human-readable description",
    "code": "MACHINE_READABLE_CODE",
    "reference": "abc123"
  }
}
```

---

## Priority

| #   | Issue                           | Severity | Effort |
| --- | ------------------------------- | -------- | ------ |
| 1   | Exposed exception details       | High     | Low    |
| 2   | All errors → 500                | High     | Medium |
| 3   | Wrong status codes              | Medium   | Low    |
| 4   | Mixed response formats          | Medium   | Medium |
| 5   | Generic auth exception catching | Medium   | Low    |
| 6   | Silent background failures      | High     | Medium |
| 7   | No global exception handler     | Medium   | Low    |
