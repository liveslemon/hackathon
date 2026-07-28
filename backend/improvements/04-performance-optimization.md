# ✅ COMPLETED

# 04 — Performance Optimization

## Summary

The backend has performance issues that will degrade as the user base grows: missing pagination returns unbounded datasets, N+1 query patterns cause excessive database calls, and there is no rate limiting to prevent abuse of expensive operations (LLM calls, embedding generation).

---

## Issues

### 1. No Pagination on Admin Directory

**File:** `routers/admin.py` (lines 73–80)

```python
@router.get("/admin/directory")
async def fetch_admin_directory(current_user = Depends(verify_admin)):
    res = await asyncio.to_thread(
        lambda: supabase.table("profiles").select(
            "id, full_name, role, company_name, company_description, course, level, cv_url, is_admin"
        ).execute()
    )
    return res.data or []
```

**Impact:** Returns ALL user profiles in a single response. With 10,000 users, this returns ~5MB of JSON, causing:

- Slow API response (seconds)
- High memory usage on server
- Client browser lag/crash
- Unnecessary bandwidth consumption

**Recommended Fix:**

```python
@router.get("/admin/directory")
async def fetch_admin_directory(
    current_user = Depends(verify_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
):
    offset = (page - 1) * page_size

    # Get total count
    count_res = await asyncio.to_thread(
        lambda: supabase.table("profiles").select("id", count="exact").execute()
    )
    total = count_res.count or 0

    # Get page
    res = await asyncio.to_thread(
        lambda ps=page_size, off=offset: supabase.table("profiles")
            .select("id, full_name, role, company_name, course, level, cv_url, is_admin")
            .range(off, off + ps - 1)
            .execute()
    )

    return {
        "data": res.data or [],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
        }
    }
```

---

### 2. No Pagination on Student Logbook Entries

**File:** `routers/logbook.py` (lines 64–70)

```python
@router.get("/api/logbook/student")
async def get_student_entries(student_id: str, current_user = Depends(get_current_user)):
    res = supabase.table("logbook_entries").select("*").eq("student_id", student_id).order("date", desc=True).execute()
    return {"entries": res.data}
```

**Impact:** A student with a year of daily entries (365+) gets all entries at once. Over multiple years this grows unbounded.

**Recommended Fix:**

```python
@router.get("/api/logbook/student")
async def get_student_entries(
    student_id: str,
    current_user = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
):
    offset = (page - 1) * page_size
    res = supabase.table("logbook_entries").select("*") \
        .eq("student_id", student_id) \
        .order("date", desc=True) \
        .range(offset, offset + page_size - 1) \
        .execute()
    return {"entries": res.data, "page": page, "page_size": page_size}
```

---

### 3. No Pagination on Student Applications

**File:** `routers/applications.py` (lines 150–155)

```python
@router.get("/applications/student")
def get_student_applications(current_user = Depends(get_current_user)):
    res = supabase.table("applied_internships").select("*, internships(*)").eq("user_id", current_user.id).execute()
    return {"applications": res.data or []}
```

**Impact:** Returns all applications with full internship details (joined). A student who applies to 100+ internships gets a massive payload with all internship metadata.

**Recommended Fix:** Add pagination and return only needed fields:

```python
@router.get("/applications/student")
def get_student_applications(
    current_user = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
):
    offset = (page - 1) * page_size
    res = supabase.table("applied_internships") \
        .select("id, status, match_score, created_at, internships(id, role, company)") \
        .eq("user_id", current_user.id) \
        .order("created_at", desc=True) \
        .range(offset, offset + page_size - 1) \
        .execute()
    return {"applications": res.data or [], "page": page}
```

---

### 4. N+1 Query Pattern in Applicants Endpoint

**File:** `routers/applications.py` (lines 132–147)

```python
def get_applicants(internship_id: str, current_user = Depends(get_current_user)):
    # Query 1: Get applications
    res_apps = supabase.table("applied_internships").select("*").eq("internship_id", internship_id).order("match_score", desc=True).execute()
    apps = res_apps.data or []

    # Query 2: Get all profiles for those users
    uids = [a["user_id"] for a in apps if a.get("user_id")]
    res_profiles = supabase.table("profiles").select("id, full_name, course, level, cv_url").in_("id", uids).execute()
    p_map = {p["id"]: p for p in (res_profiles.data or [])}
```

**Impact:** Two separate round-trips to the database. While not a classic N+1 (it batches the second query), it could be a single query with a join.

**Recommended Fix:**

```python
def get_applicants(internship_id: str, current_user = Depends(get_current_user)):
    res = supabase.table("applied_internships") \
        .select("*, profiles(id, full_name, course, level, cv_url)") \
        .eq("internship_id", internship_id) \
        .order("match_score", desc=True) \
        .limit(50) \
        .execute()
    return {"applicants": res.data or []}
```

---

### 5. Admin Search — Hardcoded Limit with No Offset

**File:** `routers/admin.py` (lines 98–110)

```python
asyncio.to_thread(lambda: supabase.table("internships").select("*")
    .or_(f"role.ilike.%{q}%,company.ilike.%{q}%").limit(5).execute()),
asyncio.to_thread(lambda: supabase.table("profiles").select("*")
    .or_(f"full_name.ilike.%{q}%,company_name.ilike.%{q}%").limit(5).execute())
```

**Impact:** Returns max 5 results with no way to paginate. If the result the admin seeks is #6, they cannot find it.

**Recommended Fix:**

```python
async def search_platform(
    q: str = Query(..., min_length=1, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user = Depends(verify_admin)
):
    offset = (page - 1) * page_size
    # Apply offset and configurable limit
    ...
```

---

### 6. No Rate Limiting

**Files:** All routers — no rate limiting middleware exists.

**Impact:**

- LLM endpoints (`/api/logbook/enhance`, `/draft-cover-letter-stream`, `/api/analysis/skill-gap`) can be called unlimited times, burning expensive API credits
- CV upload can be spammed to fill storage
- Search endpoints can be used for data scraping
- Login/auth endpoints vulnerable to brute force

**Recommended Fix:**

Install `slowapi`:

```bash
pip install slowapi
```

```python
# main.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# routers/analysis.py
from slowapi import limiter

@router.get("/api/analysis/skill-gap")
@limiter.limit("10/minute")
async def get_skill_gap_analysis(...):
    ...
```

Suggested limits:
| Endpoint Type | Limit |
|---|---|
| LLM generation | 10/minute |
| CV upload | 3/hour |
| Search | 30/minute |
| Standard CRUD | 60/minute |
| Auth endpoints | 5/minute |

---

### 7. Admin Stats — Three Sequential DB Calls

**File:** `routers/admin.py` (lines 11–25)

```python
tasks = [
    asyncio.to_thread(lambda: supabase.table("profiles").select("id", count="exact").eq("role", "student").execute()),
    asyncio.to_thread(lambda: supabase.table("internships").select("id", count="exact").execute()),
    asyncio.to_thread(lambda: supabase.table("applied_internships").select("id", count="exact").execute())
]
results = await asyncio.gather(*tasks)
```

**Impact:** While `asyncio.gather` runs them concurrently, this still makes 3 HTTP requests to Supabase. For stats that don't change frequently, this is wasteful.

**Recommended Fix:**

Cache the results with a short TTL:

```python
from services.cache_service import match_result_cache
import time

STATS_CACHE_KEY = "admin:stats"
STATS_TTL = 60  # 1 minute

@router.get("/admin/stats")
async def get_admin_stats(current_user = Depends(verify_admin)):
    cached = match_result_cache.get(STATS_CACHE_KEY)
    if cached:
        return cached

    # ... fetch from DB
    result = {"total_students": ..., "total_internships": ..., "total_applications": ...}
    match_result_cache.set(STATS_CACHE_KEY, result)
    return result
```

---

### 8. Full `SELECT *` on Large Tables

**Files:** `routers/admin.py`, `routers/applications.py`, `routers/cv.py`

```python
supabase.table("match_results").select("*").eq("user_id", user_id).execute()
supabase.table("applied_internships").select("*").eq(...).execute()
```

**Impact:** Fetches all columns including large text fields (embeddings, full descriptions) when only a few columns are needed. Wastes bandwidth and memory.

**Recommended Fix:**

Select only needed columns:

```python
# Instead of select("*")
supabase.table("match_results") \
    .select("id, internship_id, match_score, matched_at") \
    .eq("user_id", user_id) \
    .execute()
```

---

## Priority

| #   | Issue                         | Severity | Effort |
| --- | ----------------------------- | -------- | ------ |
| 1   | Admin directory no pagination | High     | Medium |
| 2   | Logbook no pagination         | Medium   | Low    |
| 3   | Applications no pagination    | Medium   | Low    |
| 4   | N+1 applicants query          | Medium   | Low    |
| 5   | Search hardcoded limit        | Low      | Low    |
| 6   | No rate limiting              | High     | Medium |
| 7   | Uncached admin stats          | Low      | Low    |
| 8   | SELECT \* overuse             | Medium   | Low    |
