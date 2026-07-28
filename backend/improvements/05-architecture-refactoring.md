# ✅ COMPLETED

# 05 — Architecture Refactoring

## Summary

The backend suffers from resource leaks, global singleton anti-patterns, lack of dependency injection, and duplicated database logic scattered across routers. These issues make the codebase harder to test, maintain, and scale.

---

## Issues

### 1. HTTP Client Resource Leak — Never Closed

**File:** `services/embedding_service.py` (lines 8–12)

```python
_EMBEDDING_CLIENT = httpx.AsyncClient(
    timeout=httpx.Timeout(30.0, connect=10.0),
    limits=httpx.Limits(max_keepalive_connections=20, max_connections=100),
)
```

**Impact:** This `httpx.AsyncClient` is created at module import time and never closed. Over the application lifetime:

- Connection pool grows and never releases connections
- On server shutdown, open connections are not gracefully closed
- File descriptors leak
- Under high load, connection limit (100) is reached and requests hang

**Recommended Fix:**

Use FastAPI's lifespan events:

```python
# main.py
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    from services.embedding_service import _EMBEDDING_CLIENT
    yield
    # Shutdown
    await _EMBEDDING_CLIENT.aclose()

app = FastAPI(lifespan=lifespan)
```

Or better yet, use dependency injection:

```python
# services/embedding_service.py
class EmbeddingService:
    def __init__(self):
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
            limits=httpx.Limits(max_keepalive_connections=20, max_connections=100),
        )

    async def close(self):
        await self.client.aclose()

    async def get_embedding(self, text: str) -> list[float]:
        ...

# Singleton with proper lifecycle
_service: EmbeddingService | None = None

def get_embedding_service() -> EmbeddingService:
    global _service
    if _service is None:
        _service = EmbeddingService()
    return _service
```

---

### 2. Multiple Unclosed AsyncOpenAI Clients

**File:** `services/llm_service.py` (lines 15–37)

```python
def __init__(self):
    self.providers = []
    timeout_config = 10.0

    if settings.GROQ_API_KEY:
        self.providers.append({
            "client": AsyncOpenAI(api_key=settings.GROQ_API_KEY, base_url="https://api.groq.com/openai/v1"),
            ...
        })
    if settings.OPENROUTER_API_KEY:
        self.providers.append({
            "client": AsyncOpenAI(api_key=settings.OPENROUTER_API_KEY, base_url="https://openrouter.ai/api/v1"),
            ...
        })
    # ... more clients
```

**Impact:** Each `AsyncOpenAI` instance wraps an `httpx.AsyncClient`. None are ever closed. With 4+ providers, that's 4+ leaked HTTP connection pools.

**Recommended Fix:**

```python
class UnifiedLLMClient:
    def __init__(self):
        self.providers = []
        self._setup_providers()

    def _setup_providers(self):
        ...

    async def close(self):
        for provider in self.providers:
            await provider["client"].close()

# Register in lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await llm_client.close()
```

---

### 3. Global Singletons Instead of Dependency Injection

**Files:** `services/llm_service.py` (line 106), `services/cache_service.py` (lines 67–69)

```python
# llm_service.py — global instance
llm_client = UnifiedLLMClient()

# cache_service.py — global instances
redis_client = None
embedding_cache = TwoLayerCache(prefix="embed:", max_memory_size=2000, ttl_seconds=86400)
match_result_cache = TwoLayerCache(prefix="match:", max_memory_size=5000, ttl_seconds=3600)
```

**Impact:**

- **Untestable:** Cannot mock these in unit tests without monkey-patching
- **No lifecycle control:** Cannot create/destroy per-request or per-test
- **Shared state pollution:** In-memory cache shared across all requests — potential data leakage
- **Import side effects:** Importing the module instantiates clients (fails if env vars missing)

**Recommended Fix:**

Use FastAPI's dependency injection:

```python
# services/llm_service.py
class UnifiedLLMClient:
    ...

_llm_client: UnifiedLLMClient | None = None

def get_llm_client() -> UnifiedLLMClient:
    global _llm_client
    if _llm_client is None:
        _llm_client = UnifiedLLMClient()
    return _llm_client

# In routers:
@router.post("/api/logbook/enhance")
async def enhance_entry(
    payload: EnhanceRequest,
    current_user = Depends(get_current_user),
    llm: UnifiedLLMClient = Depends(get_llm_client),
):
    result = await llm.generate_text(...)
```

For tests:

```python
app.dependency_overrides[get_llm_client] = lambda: MockLLMClient()
```

---

### 4. Duplicated Supabase Query Logic Across Routers

**Files:** Multiple routers duplicate the same queries:

```python
# routers/cv.py line 132 — fetches profile
profile = supabase.table("profiles").select("*").eq("id", user_id).single().execute()

# routers/applications.py line 34 — fetches profile
profile = supabase.table("profiles").select("cv_text, skills").eq("id", payload.user_id).single().execute()

# services/supabase_service.py line 19 — also fetches profile
def get_user_profile(user_id: str):
    res = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    return res.data
```

**Impact:**

- No single source of truth for data access patterns
- Query changes must be replicated across multiple files
- Inconsistent field selection (`*` vs specific columns)
- Cannot add caching/logging/metrics in one place
- Harder to refactor database schema

**Recommended Fix:**

Centralize all database operations in a repository layer:

```python
# repositories/profile_repository.py
from core.db import supabase

class ProfileRepository:
    @staticmethod
    def get_by_id(user_id: str, fields: str = "*") -> dict | None:
        res = supabase.table("profiles").select(fields).eq("id", user_id).single().execute()
        return res.data

    @staticmethod
    def get_by_ids(user_ids: list[str], fields: str = "id, full_name, course, level") -> list[dict]:
        res = supabase.table("profiles").select(fields).in_("id", user_ids).execute()
        return res.data or []

    @staticmethod
    def update(user_id: str, data: dict) -> dict | None:
        res = supabase.table("profiles").update(data).eq("id", user_id).execute()
        return res.data[0] if res.data else None
```

---

### 5. No Separation Between Business Logic and HTTP Layer

**Files:** All routers contain business logic directly.

```python
# routers/cv.py — business logic mixed with HTTP handling
@router.post("/api/cv/upload")
async def upload_cv(file: UploadFile, current_user = Depends(get_current_user)):
    # Validation (HTTP concern)
    if not file.filename.lower().endswith(".pdf"):
        return JSONResponse(...)

    # File I/O (infrastructure concern)
    content = await file.read()
    with tempfile.NamedTemporaryFile(...) as tmp:
        tmp.write(content)

    # Text extraction (business logic)
    cv_text = extract_text(temp_path)

    # Storage upload (infrastructure)
    supabase.storage.from_("cvs").upload(...)

    # Database update (data access)
    supabase.table("profiles").update({"cv_url": ..., "cv_text": ...}).eq(...)

    # Background processing (orchestration)
    background_tasks.add_task(process_matches_in_background, ...)
```

**Impact:** Single function handles 5 different concerns. Cannot test business logic without mocking HTTP, storage, and database.

**Recommended Fix:**

Split into layers:

```
routers/     → HTTP handling, request parsing, response formatting
services/    → Business logic, orchestration
repositories/ → Data access (Supabase queries)
```

```python
# routers/cv.py — thin HTTP layer
@router.post("/api/cv/upload")
async def upload_cv(file: UploadFile, current_user = Depends(get_current_user)):
    result = await cv_service.process_upload(file, current_user.id)
    return result

# services/cv_service.py — business logic
class CVService:
    async def process_upload(self, file: UploadFile, user_id: str) -> dict:
        content = await self._validate_and_read(file)
        cv_text = self._extract_text(content)
        cv_url = await self._store_file(content, user_id)
        await self._update_profile(user_id, cv_url, cv_text)
        await self._trigger_matching(user_id, cv_text)
        return {"cv_url": cv_url, "success": True}
```

---

### 6. No Database Connection Pooling

**File:** `core/db.py`

```python
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_ROLE_KEY,
    options=ClientOptions(
        postgrest_client_timeout=15.0,
        storage_client_timeout=15.0,
    ),
)
```

**Impact:** A single Supabase client instance is shared across all concurrent requests. This works for Supabase's HTTP-based API (PostgREST), but:

- No request isolation — if one request causes a client-side error state, others may be affected
- No connection pool metrics
- No per-request timeout override capability

**Recommended Fix:**

For Supabase's HTTP API, the current approach is acceptable, but add:

```python
# core/db.py
from functools import lru_cache

@lru_cache()
def get_supabase() -> Client:
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY,
        options=ClientOptions(
            postgrest_client_timeout=15.0,
            storage_client_timeout=15.0,
        ),
    )

# Use as dependency
def get_db() -> Client:
    return get_supabase()
```

---

### 7. Temp Files Not Cleaned Up on Error

**File:** `routers/cv.py` (lines 58–66)

```python
content = await file.read()
with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
    tmp.write(content)
    temp_path = tmp.name

# If an exception occurs between here and os.unlink(temp_path),
# the temp file remains on disk forever
```

**Impact:** If processing fails after writing the temp file but before cleanup, files accumulate in `/tmp`. Over time this can fill the disk.

**Recommended Fix:**

```python
import contextlib

@contextlib.contextmanager
def temp_pdf(content: bytes):
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    try:
        tmp.write(content)
        tmp.close()
        yield tmp.name
    finally:
        with contextlib.suppress(OSError):
            os.unlink(tmp.name)

# Usage
with temp_pdf(content) as temp_path:
    cv_text = extract_text(temp_path)
    # Even if this throws, file is cleaned up
```

---

## Priority

| #   | Issue                      | Severity | Effort |
| --- | -------------------------- | -------- | ------ |
| 1   | HTTP client never closed   | High     | Low    |
| 2   | AsyncOpenAI clients leaked | High     | Low    |
| 3   | Global singletons          | Medium   | High   |
| 4   | Duplicated query logic     | Medium   | High   |
| 5   | No layer separation        | Medium   | High   |
| 6   | No connection management   | Low      | Medium |
| 7   | Temp file leaks            | Medium   | Low    |
