# ✅ COMPLETED

# 01 — Security Vulnerabilities

## Summary

The backend has several critical security issues that could lead to unauthorized access, data exposure, and privilege escalation. These should be the **highest-priority fixes** before any production deployment.

---

## Issues

### 1. Hardcoded Admin Email Bypass

**File:** `core/security.py` (lines 25–30)

```python
async def verify_admin(current_user = Depends(get_current_user)):
    """Validates the user has admin role."""
    # Permanent elevation for the system admin
    if current_user.email == "hillary.ilona@pau.edu.ng":
        return current_user
```

**Impact:** Anyone who gains control of this email address (or creates an account with it) gets permanent, unconditional admin privileges. This bypass is invisible to audits since it never checks the database.

**Recommended Fix:**

```python
# Move admin emails to environment variable
ADMIN_EMAILS = settings.ADMIN_EMAILS.split(",") if settings.ADMIN_EMAILS else []

async def verify_admin(current_user = Depends(get_current_user)):
    if current_user.email in ADMIN_EMAILS:
        return current_user
    # ... continue with database role check
```

Or better yet, remove the bypass entirely and rely on the database `is_admin` / `role` fields exclusively.

---

### 2. Secrets Exposed in Version Control

**File:** `.env` (tracked in git)

```
SMTP_PASSWORD=<REDACTED>
SUPABASE_SERVICE_ROLE_KEY=<REDACTED>
NVIDIA_API_KEY=<REDACTED>
OPENROUTER_API_KEY=<REDACTED>
TOGETHER_API_KEY=<REDACTED>
GROQ_API_KEY=<REDACTED>
COHERE_API_KEY=<REDACTED>
```

**Impact:** All API keys and credentials are compromised. Anyone with repository read access (including GitHub if the repo is public or forked) can use these keys to impersonate the service, access the database, send emails, and consume paid APIs.

**Recommended Fix:**

1. **Immediately rotate all exposed keys** — they must be considered compromised.
2. Add `.env` to `.gitignore`.
3. Remove `.env` from git history using `git filter-branch` or BFG Repo Cleaner.
4. Provide a `.env.example` with placeholder values.
5. Use a secrets manager (e.g., Doppler, AWS Secrets Manager, or GitHub Actions secrets for CI).

---

### 3. Hardcoded Admin Password in Source Code

**File:** `create_admin.py` (lines 20–21)

```python
ADMIN_EMAIL = "admin@pau.edu.ng"
ADMIN_PASSWORD = "Admin@12345"
```

**Impact:** Default admin credentials visible in source code. If this script runs in production, the admin password is trivially guessable.

**Recommended Fix:**

```python
import os
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")
if not ADMIN_EMAIL or not ADMIN_PASSWORD:
    raise SystemExit("Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables.")
```

---

### 4. Wildcard CORS with Credentials

**File:** `core/config.py` (line 11) + `main.py` (lines 21–25)

```python
# config.py
FRONTEND_URL: str = "*"

# main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],  # Resolves to ["*"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Impact:** Wildcard origin combined with `allow_credentials=True` allows any website to make authenticated cross-origin requests to your API. This enables CSRF attacks and credential theft from any domain.

**Recommended Fix:**

```python
# config.py
FRONTEND_URL: str = "http://localhost:3000"  # Default to local dev
ALLOWED_ORIGINS: list[str] = []  # Additional origins

# main.py
origins = [settings.FRONTEND_URL] + settings.ALLOWED_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

---

### 5. Public Debug Endpoint — No Authentication

**File:** `routers/cv.py` (line 201)

```python
@router.get("/debug/match-results/{user_id}")
def debug_results(user_id: str):
    res = supabase.table("match_results").select("*").eq("user_id", user_id).execute()
    return {"user_id": user_id, "count": len(res.data), "data": res.data}
```

**Impact:** Anyone can fetch match results for any user without authentication. Exposes sensitive AI matching data, skills analysis, and score breakdowns.

**Recommended Fix:**

- Remove this endpoint entirely, or
- Gate it behind `verify_admin` and a feature flag:

```python
@router.get("/debug/match-results/{user_id}")
async def debug_results(user_id: str, current_user=Depends(verify_admin)):
    if not settings.DEBUG_MODE:
        raise HTTPException(status_code=404)
    ...
```

---

### 6. Missing Authorization on Application Status Update

**File:** `routers/applications.py` (lines 141–145)

```python
@router.put("/applications/{app_id}/status")
def update_status(app_id: str, payload: ApplicationStatusUpdate, current_user = Depends(get_current_user)):
    supabase.table("applied_internships").update({"status": payload.status}).eq("id", app_id).execute()
    return {"success": True}
```

**Impact:** Any authenticated user can change the status of ANY application (accept/reject other users' applications). There's no check that the current user is the employer who owns the internship.

**Recommended Fix:**

```python
@router.put("/applications/{app_id}/status")
def update_status(app_id: str, payload: ApplicationStatusUpdate, current_user = Depends(get_current_user)):
    # Fetch the application and verify ownership
    app = supabase.table("applied_internships").select("*, internships(employer_id)").eq("id", app_id).single().execute()
    if not app.data:
        raise HTTPException(status_code=404, detail="Application not found")
    if app.data["internships"]["employer_id"] != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this application")

    supabase.table("applied_internships").update({"status": payload.status}).eq("id", app_id).execute()
    return {"success": True}
```

---

### 7. System Version and Configuration Leakage

**File:** `routers/system.py` (lines 7–12)

```python
@router.get("/")
def home():
    return {
        "status": "online",
        "version": "v4.2-async",
        "ai_enabled": bool(settings.NVIDIA_API_KEY),
    }
```

**Impact:** Reveals internal version string and whether AI keys are configured. Attackers can use this for fingerprinting and targeted exploits.

**Recommended Fix:**

```python
@router.get("/")
def home():
    return {"status": "online"}
```

---

### 8. Dual Admin Schema Creates Privilege Escalation Risk

**File:** `core/security.py` (lines 40–41)

```python
is_admin = res.data.get("role") == "admin" or res.data.get("is_admin") == True
```

**Impact:** Two separate fields control admin access (`role` and `is_admin`). If one is updated but not the other, inconsistencies arise. An attacker who can modify either field (e.g., through a profile update endpoint) gains admin access.

**Recommended Fix:**

Pick a single source of truth:

```python
# Option A: Use only the role field
is_admin = res.data.get("role") == "admin"

# Option B: Use only the boolean field
is_admin = res.data.get("is_admin") is True
```

Add a database constraint to keep them in sync if both must exist.

---

## Priority

| #   | Issue                       | Severity | Effort |
| --- | --------------------------- | -------- | ------ |
| 1   | Hardcoded admin bypass      | Critical | Low    |
| 2   | Secrets in git              | Critical | Medium |
| 3   | Hardcoded admin password    | Critical | Low    |
| 4   | Wildcard CORS + credentials | Critical | Low    |
| 5   | Public debug endpoint       | Critical | Low    |
| 6   | Missing authorization       | Critical | Medium |
| 7   | Version leakage             | Medium   | Low    |
| 8   | Dual admin schema           | High     | Medium |
