# ⚠️ PARTIALLY COMPLETED — Request ID middleware + access logging done. Structured logging (structlog) and Prometheus metrics require adding new dependencies.

# 10 — Observability & Monitoring

## Summary

The backend lacks structured logging, metrics collection, distributed tracing, and alerting. When issues occur in production, diagnosing root causes requires manual log searching with no correlation between requests, no performance baselines, and no automated alerts.

---

## Issues

### 1. Unstructured Logging

**Files:** All routers and services use basic `logger.error(f"...")` calls.

```python
# routers/admin.py
logger.error(f"Error fetching admin stats: {e}")

# services/llm_service.py
logger.warning(f"Provider {provider['name']} failed: {e}")

# routers/cv.py
logger.error(f"Background match processing failed for user {user_id}: {e}")
```

**Impact:**

- Log messages are free-form strings — cannot be parsed or queried
- No request ID correlation — cannot trace a single request across multiple log lines
- No structured fields — cannot filter by user_id, endpoint, or duration
- Difficult to set up log-based alerting

**Recommended Fix:**

Use structured logging with `structlog` or `python-json-logger`:

```bash
pip install structlog
```

```python
# core/logging.py
import structlog
import logging

def setup_logging():
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    )

logger = structlog.get_logger()
```

```python
# Usage in routers
from core.logging import logger

@router.get("/admin/stats")
async def get_admin_stats(current_user = Depends(verify_admin)):
    log = logger.bind(user_id=current_user.id, endpoint="/admin/stats")
    try:
        ...
        log.info("admin_stats_fetched", total_students=count)
        return result
    except Exception as e:
        log.error("admin_stats_failed", error=str(e), exc_info=True)
        raise
```

Output:

```json
{
  "event": "admin_stats_fetched",
  "user_id": "abc-123",
  "endpoint": "/admin/stats",
  "total_students": 42,
  "level": "info",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

### 2. No Request ID / Correlation

**Impact:** When multiple requests are processed concurrently, log lines from different requests are interleaved. Cannot trace "what happened for this specific request."

**Recommended Fix:**

Add request ID middleware:

```python
# middleware/request_id.py
import uuid
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import structlog

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])

        # Bind to structlog context for this request
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

# main.py
app.add_middleware(RequestIDMiddleware)
```

Now ALL log lines for a request automatically include `request_id`.

---

### 3. No Performance Metrics

**Impact:**

- No visibility into response times per endpoint
- No tracking of LLM call latency or failure rates
- No database query timing
- No way to detect performance degradation before users complain
- Cannot set SLOs (Service Level Objectives)

**Recommended Fix:**

Use `prometheus-fastapi-instrumentator`:

```bash
pip install prometheus-fastapi-instrumentator
```

```python
# main.py
from prometheus_fastapi_instrumentator import Instrumentator

instrumentator = Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    excluded_handlers=["/health", "/metrics"],
)
instrumentator.instrument(app).expose(app, endpoint="/metrics")
```

Custom metrics for business logic:

```python
# core/metrics.py
from prometheus_client import Counter, Histogram

# LLM metrics
llm_request_duration = Histogram(
    "llm_request_duration_seconds",
    "LLM API call duration",
    labelnames=["provider", "status"],
)

llm_failures = Counter(
    "llm_failures_total",
    "Total LLM provider failures",
    labelnames=["provider", "error_type"],
)

# Matching metrics
match_computation_duration = Histogram(
    "match_computation_duration_seconds",
    "Time to compute match scores for a user",
)

# Application metrics
applications_submitted = Counter(
    "applications_submitted_total",
    "Total applications submitted",
)

# Usage in services/llm_service.py
import time

async def generate_text(self, prompt, ...):
    for provider in self.providers:
        start = time.time()
        try:
            result = await provider["client"].chat.completions.create(...)
            duration = time.time() - start
            llm_request_duration.labels(provider=provider["name"], status="success").observe(duration)
            return result.choices[0].message.content
        except Exception as e:
            duration = time.time() - start
            llm_request_duration.labels(provider=provider["name"], status="error").observe(duration)
            llm_failures.labels(provider=provider["name"], error_type=type(e).__name__).inc()
```

---

### 4. No Request Logging Middleware

**Impact:** No centralized logging of all incoming requests with method, path, status code, and duration. Must check individual endpoint logs.

**Recommended Fix:**

```python
# middleware/access_log.py
import time
from starlette.middleware.base import BaseHTTPMiddleware
from core.logging import logger

class AccessLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        start = time.time()

        response = await call_next(request)

        duration_ms = (time.time() - start) * 1000
        logger.info(
            "request_completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=round(duration_ms, 2),
            client_ip=request.client.host if request.client else None,
        )

        return response

# main.py
app.add_middleware(AccessLogMiddleware)
```

---

### 5. Silent Cache Failures

**File:** `services/cache_service.py` (lines 45–56)

```python
except Exception as e:
    pass  # Line 49, 65
```

**Impact:** Redis failures are completely invisible. You cannot know:

- If the cache is working at all
- Hit rate vs miss rate
- If Redis is down and all requests go to database
- Performance impact of cache failures

**Recommended Fix:**

```python
# services/cache_service.py
from core.metrics import cache_hits, cache_misses, cache_errors

def get(self, key: str):
    try:
        # Try memory cache first
        if key in self._memory:
            cache_hits.labels(layer="memory").inc()
            return self._memory[key]

        # Try Redis
        if redis_client:
            value = redis_client.get(self.prefix + key)
            if value:
                cache_hits.labels(layer="redis").inc()
                return json.loads(value)

        cache_misses.inc()
        return None
    except Exception as e:
        cache_errors.labels(operation="get").inc()
        logger.warning("cache_error", operation="get", key=key, error=str(e))
        return None  # Graceful degradation
```

---

### 6. No Alerting on Critical Failures

**Impact:** When background processing fails, LLM providers go down, or the database becomes slow — nobody is notified. Issues are discovered only when users report them.

**Recommended Fix:**

With Prometheus metrics in place, set up alerting rules:

```yaml
# alerts/rules.yml (Prometheus AlertManager)
groups:
  - name: internmatch
    rules:
      - alert: HighLLMFailureRate
        expr: rate(llm_failures_total[5m]) > 0.5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "LLM failure rate > 50% for 2 minutes"

      - alert: SlowResponses
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P95 response time > 5 seconds"

      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 3m
        labels:
          severity: critical
        annotations:
          summary: "Error rate > 5% for 3 minutes"
```

For simpler setups, use webhook-based alerting:

```python
# core/alerting.py
import httpx

async def send_alert(title: str, message: str, severity: str = "warning"):
    """Send alert to Discord/Slack webhook."""
    webhook_url = settings.ALERT_WEBHOOK_URL
    if not webhook_url:
        return

    await httpx.AsyncClient().post(webhook_url, json={
        "content": f"**[{severity.upper()}]** {title}\n{message}"
    })
```

---

### 7. No Error Tracking / APM

**Impact:** No aggregated view of errors across time. Cannot see error trends, most common errors, or affected users.

**Recommended Fix:**

Integrate Sentry (free tier available):

```bash
pip install sentry-sdk[fastapi]
```

```python
# main.py
import sentry_sdk

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.1,  # 10% of requests traced
        profiles_sample_rate=0.1,
    )
```

This automatically captures:

- All unhandled exceptions with full stack traces
- Request context (URL, headers, user)
- Performance traces
- Breadcrumbs (what happened before the error)

---

### 8. No Database Query Monitoring

**Impact:** Cannot identify slow queries, N+1 patterns, or connection issues until they cause user-visible problems.

**Recommended Fix:**

Wrap Supabase calls with timing:

```python
# core/db.py
import time
from functools import wraps
from core.metrics import db_query_duration

def timed_query(table_name: str):
    """Decorator to time database operations."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start
                db_query_duration.labels(table=table_name, status="success").observe(duration)
                if duration > 1.0:
                    logger.warning("slow_query", table=table_name, duration_seconds=duration)
                return result
            except Exception as e:
                duration = time.time() - start
                db_query_duration.labels(table=table_name, status="error").observe(duration)
                raise
        return wrapper
    return decorator
```

---

## Recommended Observability Stack

| Layer    | Tool                 | Purpose                     |
| -------- | -------------------- | --------------------------- |
| Logging  | structlog + JSON     | Structured, queryable logs  |
| Metrics  | Prometheus + Grafana | Dashboards, SLO tracking    |
| Tracing  | OpenTelemetry        | Distributed request tracing |
| Errors   | Sentry               | Error aggregation, alerting |
| Alerting | PagerDuty/Slack      | Incident notification       |

For a minimal setup (hackathon/startup), just add:

1. Structured logging (structlog)
2. Request ID middleware
3. Sentry for error tracking

---

## Priority

| #   | Issue                  | Severity | Effort |
| --- | ---------------------- | -------- | ------ |
| 1   | Unstructured logging   | Medium   | Medium |
| 2   | No request correlation | Medium   | Low    |
| 3   | No performance metrics | High     | Medium |
| 4   | No request logging     | Medium   | Low    |
| 5   | Silent cache failures  | Medium   | Low    |
| 6   | No alerting            | High     | Medium |
| 7   | No error tracking      | High     | Low    |
| 8   | No DB query monitoring | Medium   | Medium |
