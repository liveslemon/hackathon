# ✅ COMPLETED

# 08 — Configuration Management

## Summary

The application has secrets tracked in version control, missing startup validation for critical environment variables, hardcoded values that should be configurable, and no environment-based configuration strategy.

---

## Issues

### 1. `.env` File Tracked in Git

**File:** `.env` (exists in repository)

```
SMTP_PASSWORD=<REDACTED>
SUPABASE_SERVICE_ROLE_KEY=<REDACTED>
NVIDIA_API_KEY=<REDACTED>
OPENROUTER_API_KEY=<REDACTED>
TOGETHER_API_KEY=<REDACTED>
GROQ_API_KEY=<REDACTED>
COHERE_API_KEY=<REDACTED>
```

**Impact:** All secrets are permanently exposed in git history. Even if the file is later deleted, the data remains in git log. Fork history, CI logs, and anyone with repo access can extract these credentials.

**Recommended Fix:**

1. **Immediately rotate ALL exposed credentials.** They are compromised.

2. Add `.env` to `.gitignore`:

```gitignore
# .gitignore
.env
.env.local
.env.production
```

3. Remove from git history:

```bash
# Using BFG Repo Cleaner (preferred)
bfg --delete-files .env
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Or git filter-branch
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch .env' --prune-empty --tag-name-filter cat -- --all
```

4. Create `.env.example`:

```env
# .env.example — Copy to .env and fill in values
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
NVIDIA_API_KEY=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
FRONTEND_URL=http://localhost:3000
RESEND_API_KEY=
OPENROUTER_API_KEY=
TOGETHER_API_KEY=
GROQ_API_KEY=
COHERE_API_KEY=
```

---

### 2. No Startup Validation for Required Settings

**File:** `core/config.py`

```python
class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    NVIDIA_API_KEY: str = ""
    RESEND_API_KEY: str = ""
    COHERE_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    TOGETHER_API_KEY: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    FRONTEND_URL: str = "*"

    class Config:
        env_file = ".env"
```

**Impact:**

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are required (no default) but there's no validation they're actually set and non-empty
- If `.env` is missing, Pydantic raises a generic error at import time — no helpful message
- Optional keys with `""` default silently disable features with no warning
- Application starts "successfully" but crashes on first database call

**Recommended Fix:**

```python
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Required — app cannot function without these
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # Required for AI features
    NVIDIA_API_KEY: str = ""
    COHERE_API_KEY: str = ""

    # At least one LLM provider required
    GROQ_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    TOGETHER_API_KEY: str = ""

    # Email (optional but validated if provided)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    RESEND_API_KEY: str = ""

    # Security
    FRONTEND_URL: str = "http://localhost:3000"

    @field_validator("SUPABASE_URL")
    @classmethod
    def validate_supabase_url(cls, v):
        if not v or not v.startswith("http"):
            raise ValueError("SUPABASE_URL must be a valid HTTP URL")
        return v

    @field_validator("SUPABASE_SERVICE_ROLE_KEY")
    @classmethod
    def validate_service_key(cls, v):
        if not v or len(v) < 20:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY appears invalid")
        return v

    @field_validator("FRONTEND_URL")
    @classmethod
    def validate_frontend_url(cls, v):
        if v == "*":
            import warnings
            warnings.warn("FRONTEND_URL is set to '*'. This is insecure for production.")
        return v

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# Startup check
def validate_settings(settings: Settings):
    """Run at application startup to warn about missing optional config."""
    import logging
    logger = logging.getLogger(__name__)

    llm_keys = [settings.GROQ_API_KEY, settings.OPENROUTER_API_KEY, settings.TOGETHER_API_KEY]
    if not any(llm_keys):
        logger.warning("No LLM API keys configured. AI features will be unavailable.")

    if not settings.NVIDIA_API_KEY and not settings.COHERE_API_KEY:
        logger.warning("No embedding API key configured. Matching will not work.")

    email_configured = bool(settings.SMTP_HOST and settings.SMTP_PASSWORD) or bool(settings.RESEND_API_KEY)
    if not email_configured:
        logger.warning("No email service configured. Email notifications disabled.")
```

---

### 3. Hardcoded Timeouts Without Configuration

**Files:** `services/llm_service.py` (line 20), `services/embedding_service.py` (line 9), `core/db.py`

```python
# llm_service.py
timeout_config = 10.0

# embedding_service.py
_EMBEDDING_CLIENT = httpx.AsyncClient(
    timeout=httpx.Timeout(30.0, connect=10.0),
)

# core/db.py
options=ClientOptions(
    postgrest_client_timeout=15.0,
    storage_client_timeout=15.0,
)
```

**Impact:**

- Cannot tune timeouts for different deployment environments (local dev vs production)
- LLM timeout of 10s may be too aggressive for complex prompts
- No way to adjust without code changes and redeployment

**Recommended Fix:**

Add to `Settings`:

```python
class Settings(BaseSettings):
    # Timeouts (seconds)
    LLM_TIMEOUT: float = 30.0
    EMBEDDING_TIMEOUT: float = 30.0
    DB_TIMEOUT: float = 15.0
    STORAGE_TIMEOUT: float = 30.0

    # Concurrency limits
    MAX_CONCURRENT_EMBEDDINGS: int = 5
    MAX_CONCURRENT_STREAMS: int = 50
```

Usage:

```python
# services/llm_service.py
timeout_config = settings.LLM_TIMEOUT

# services/embedding_service.py
_EMBEDDING_CLIENT = httpx.AsyncClient(
    timeout=httpx.Timeout(settings.EMBEDDING_TIMEOUT, connect=10.0),
)
```

---

### 4. Hardcoded Semaphore and Cache Sizes

**Files:** `routers/cv.py` (line 56), `services/cache_service.py` (lines 67–69)

```python
# cv.py
semaphore = asyncio.Semaphore(5)

# cache_service.py
embedding_cache = TwoLayerCache(prefix="embed:", max_memory_size=2000, ttl_seconds=86400)
match_result_cache = TwoLayerCache(prefix="match:", max_memory_size=5000, ttl_seconds=3600)
```

**Impact:**

- Semaphore of 5 may be too low for high-traffic or too high for resource-constrained environments
- Cache sizes are arbitrary — no explanation of why 2000 or 5000
- TTL values are hardcoded — can't adjust for testing (short) vs production (long)

**Recommended Fix:**

```python
class Settings(BaseSettings):
    # Cache configuration
    EMBEDDING_CACHE_SIZE: int = 2000
    EMBEDDING_CACHE_TTL: int = 86400  # 24 hours
    MATCH_CACHE_SIZE: int = 5000
    MATCH_CACHE_TTL: int = 3600  # 1 hour

    # Concurrency
    CV_PROCESSING_CONCURRENCY: int = 5
```

---

### 5. Silent Feature Degradation

**Files:** `services/llm_service.py`, `services/embedding_service.py`

```python
# llm_service.py — if no keys, providers list is empty
if settings.GROQ_API_KEY:
    self.providers.append(...)
if settings.OPENROUTER_API_KEY:
    self.providers.append(...)
# If all conditions false: self.providers = []
# generate_text() will fail at runtime with "All providers failed"
```

**Impact:**

- No clear error at startup when critical features are misconfigured
- Users discover broken features only when they try to use them
- Debugging requires checking which env vars are missing

**Recommended Fix:**

Log feature availability at startup:

```python
# main.py
import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup diagnostics
    logger.info("=== Service Configuration ===")
    logger.info(f"Database: {'✓' if settings.SUPABASE_URL else '✗'}")
    logger.info(f"LLM providers: {len(llm_client.providers)}")
    logger.info(f"Embedding: {'✓' if settings.NVIDIA_API_KEY or settings.COHERE_API_KEY else '✗'}")
    logger.info(f"Email: {'✓' if settings.SMTP_HOST or settings.RESEND_API_KEY else '✗'}")
    logger.info(f"CORS origins: {settings.FRONTEND_URL}")

    if settings.FRONTEND_URL == "*":
        logger.warning("⚠ CORS allows all origins — NOT SAFE FOR PRODUCTION")

    yield
```

---

### 6. No Environment-Specific Configuration

**Impact:** No mechanism to differentiate between development, staging, and production configurations. The same settings apply everywhere.

**Recommended Fix:**

```python
from enum import Enum

class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"

class Settings(BaseSettings):
    ENVIRONMENT: Environment = Environment.DEVELOPMENT
    DEBUG: bool = False

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == Environment.PRODUCTION

    @field_validator("DEBUG")
    @classmethod
    def no_debug_in_prod(cls, v, info):
        if v and info.data.get("ENVIRONMENT") == Environment.PRODUCTION:
            raise ValueError("DEBUG cannot be True in production")
        return v
```

Usage:

```python
# Disable debug endpoints in production
if not settings.is_production:
    app.include_router(debug_router)

# Stricter CORS in production
if settings.is_production and settings.FRONTEND_URL == "*":
    raise SystemExit("FRONTEND_URL cannot be '*' in production")
```

---

### 7. No Configuration Documentation

**Impact:** New developers must read source code to understand which environment variables are needed and what they do.

**Recommended Fix:**

Create a `CONFIG.md` documenting all settings, or use the `.env.example` with detailed comments:

```env
# ===========================================
# REQUIRED — Application will not start without these
# ===========================================

# Supabase project URL (from supabase.com dashboard)
SUPABASE_URL=https://your-project.supabase.co

# Supabase service role key (NOT the anon key)
# Found in: Dashboard → Settings → API → service_role
SUPABASE_SERVICE_ROLE_KEY=

# ===========================================
# LLM PROVIDERS — At least one required for AI features
# ===========================================

# Groq (fast inference, free tier available)
# Get key: https://console.groq.com/keys
GROQ_API_KEY=

# OpenRouter (multi-model gateway)
# Get key: https://openrouter.ai/keys
OPENROUTER_API_KEY=

# Together AI
TOGETHER_API_KEY=

# ===========================================
# EMBEDDING — Required for match scoring
# ===========================================

# NVIDIA NIM (preferred)
NVIDIA_API_KEY=

# Cohere (fallback)
COHERE_API_KEY=

# ===========================================
# EMAIL — Optional, for notifications
# ===========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=

# Or use Resend instead of SMTP
RESEND_API_KEY=

# ===========================================
# SECURITY
# ===========================================

# Frontend URL for CORS. NEVER use '*' in production.
FRONTEND_URL=http://localhost:3000

# ===========================================
# OPTIONAL — Tuning
# ===========================================
ENVIRONMENT=development
DEBUG=false
LLM_TIMEOUT=30.0
EMBEDDING_TIMEOUT=30.0
```

---

## Priority

| #   | Issue                   | Severity | Effort |
| --- | ----------------------- | -------- | ------ |
| 1   | .env in git             | Critical | Medium |
| 2   | No startup validation   | High     | Low    |
| 3   | Hardcoded timeouts      | Medium   | Low    |
| 4   | Hardcoded limits        | Low      | Low    |
| 5   | Silent degradation      | Medium   | Low    |
| 6   | No env-specific config  | Medium   | Medium |
| 7   | No config documentation | Low      | Low    |
