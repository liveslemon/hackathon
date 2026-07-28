# ✅ COMPLETED

# 07 — Reliability & Resilience

## Summary

The backend lacks proper mechanisms for handling concurrent operations, external service failures, and transient errors. Race conditions, missing retry logic, and silent failures mean the system can enter inconsistent states without alerting anyone.

---

## Issues

### 1. Race Condition on Duplicate Application Submission

**File:** `routers/applications.py` (lines 108–118)

```python
# Check if already applied
existing = supabase.table("applied_internships").select("*") \
    .eq("user_id", payload.user_id) \
    .eq("internship_id", payload.internship_id).execute()

if existing.data:
    return {"success": True, "message": "Already applied."}

# ... proceed to insert
supabase.table("applied_internships").insert({...}).execute()
```

**Impact:** Between the SELECT and INSERT, another request from the same user could pass the check. Result: duplicate applications in the database.

**Timing:**

1. Request A: checks existing → empty
2. Request B: checks existing → empty
3. Request A: inserts application
4. Request B: inserts duplicate application

**Recommended Fix:**

Option A — Database unique constraint (preferred):

```sql
ALTER TABLE applied_internships
ADD CONSTRAINT unique_application UNIQUE (user_id, internship_id);
```

```python
try:
    supabase.table("applied_internships").insert({...}).execute()
except Exception as e:
    if "unique" in str(e).lower() or "duplicate" in str(e).lower():
        return {"success": True, "message": "Already applied."}
    raise
```

Option B — Upsert:

```python
supabase.table("applied_internships").upsert(
    {...},
    on_conflict="user_id,internship_id"
).execute()
```

---

### 2. Closure Bug in asyncio.to_thread Lambdas

**File:** `routers/admin.py` (lines 15–18)

```python
tasks = [
    asyncio.to_thread(lambda: supabase.table("profiles").select("id", count="exact").eq("role", "student").execute()),
    asyncio.to_thread(lambda: supabase.table("internships").select("id", count="exact").execute()),
    asyncio.to_thread(lambda: supabase.table("applied_internships").select("id", count="exact").execute())
]
```

**Impact:** Python lambdas capture variables by reference, not by value. In this specific case the lambdas don't reference any loop variable so they work correctly. However, if refactored to a loop:

```python
# THIS WOULD BE BROKEN:
tables = ["profiles", "internships", "applied_internships"]
tasks = [asyncio.to_thread(lambda: supabase.table(t).select("id", count="exact").execute()) for t in tables]
# All lambdas would use the last value of `t`
```

**Recommended Fix:**

Use `functools.partial` or default arguments:

```python
from functools import partial

def count_table(table_name: str, **filters):
    query = supabase.table(table_name).select("id", count="exact")
    for key, value in filters.items():
        query = query.eq(key, value)
    return query.execute()

tasks = [
    asyncio.to_thread(partial(count_table, "profiles", role="student")),
    asyncio.to_thread(partial(count_table, "internships")),
    asyncio.to_thread(partial(count_table, "applied_internships")),
]
```

---

### 3. Background Task Silent Failures

**File:** `routers/cv.py` (lines 27–44)

```python
async def process_matches_in_background(user_id: str, cv_text: str, internships: list):
    try:
        # Complex multi-step operation:
        # 1. Generate embedding for CV
        # 2. Generate embeddings for each internship
        # 3. Compute cosine similarities
        # 4. Store results in database
    except Exception as e:
        logger.error(f"Background match processing failed for user {user_id}: {e}")
        # User never knows matching failed
```

**Impact:**

- User uploads CV, gets success response
- Matching silently fails in background
- User sees empty/stale match results indefinitely
- No retry mechanism — failure is permanent
- No way to trigger re-processing

**Recommended Fix:**

```python
async def process_matches_in_background(user_id: str, cv_text: str, internships: list):
    max_retries = 3

    for attempt in range(max_retries):
        try:
            # Update status to "processing"
            supabase.table("profiles").update({"match_status": "processing"}).eq("id", user_id).execute()

            # ... do matching work ...

            # Update status to "completed"
            supabase.table("profiles").update({
                "match_status": "completed",
                "matched_at": datetime.utcnow().isoformat()
            }).eq("id", user_id).execute()
            return  # Success

        except Exception as e:
            logger.error(f"Match attempt {attempt + 1}/{max_retries} failed for {user_id}: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff

    # All retries exhausted
    supabase.table("profiles").update({
        "match_status": "failed",
        "match_error": "Processing failed after multiple attempts. Please re-upload your CV."
    }).eq("id", user_id).execute()
```

---

### 4. Streaming Endpoint Without Timeout or Limits

**File:** `routers/applications.py` (lines 68–88)

```python
return StreamingResponse(
    generate_cover_letter_stream(...),
    media_type="text/plain"
)
```

**Impact:**

- No timeout: if LLM hangs, the connection stays open indefinitely
- No concurrent stream limit: 1000 users streaming = 1000 open connections
- No backpressure: if client is slow to read, server buffers everything in memory
- Aborted client connections may not release server resources

**Recommended Fix:**

```python
import asyncio

async def generate_cover_letter_stream_with_timeout(prompt: str, timeout: float = 60.0):
    """Wrapper that adds timeout to LLM streaming."""
    try:
        async with asyncio.timeout(timeout):
            async for chunk in llm_client.generate_text_stream(prompt):
                yield chunk
    except asyncio.TimeoutError:
        yield "\n\n[Generation timed out. Please try again.]"

# Add concurrent stream limiting
_active_streams = 0
MAX_CONCURRENT_STREAMS = 50

@router.post("/draft-cover-letter-stream")
async def draft_cover_letter_stream(...):
    global _active_streams
    if _active_streams >= MAX_CONCURRENT_STREAMS:
        raise HTTPException(status_code=503, detail="Service busy. Please try again.")

    _active_streams += 1
    try:
        return StreamingResponse(
            generate_cover_letter_stream_with_timeout(prompt),
            media_type="text/plain"
        )
    finally:
        _active_streams -= 1
```

---

### 5. Embedding Fallback Returns Dummy Vectors

**File:** `services/routing_service.py` (lines 39–40)

```python
except Exception as e:
    logger.error(f"Embedding failed: {e}. Falling back to 50% match.")
    cv_emb, job_emb = [1.0], [0.0]  # Fake vectors → cosine similarity = 0.0
```

**Impact:**

- When embedding fails, ALL matches get a score of 0.0 (or undefined)
- This propagates as "no match" rather than "unknown"
- Users see 0% match scores that are actually "couldn't compute"
- No way to distinguish "bad match" from "system error"

**Recommended Fix:**

```python
except Exception as e:
    logger.error(f"Embedding failed for user {user_id}: {e}")
    return {
        "match_score": None,  # Explicitly null — not 0
        "match_status": "error",
        "error_message": "Could not compute match score due to service error."
    }
```

---

### 6. Vector Dimension Mismatch Silently Returns 0

**File:** `services/matching_service.py` (lines 72–75)

```python
def compute_cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
    if not vec1 or not vec2:
        return 0.0
    if len(vec1) != len(vec2):
        logger.warning("Vector dimension mismatch...")
        return 0.0  # Silent failure
```

**Impact:** A dimension mismatch indicates a serious bug (e.g., model changed, wrong embedding endpoint used). Returning 0.0 masks this entirely — it looks like a "poor match" rather than "system error."

**Recommended Fix:**

```python
def compute_cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
    if not vec1 or not vec2:
        raise ValueError("Cannot compute similarity: one or both vectors are empty")
    if len(vec1) != len(vec2):
        raise ValueError(f"Vector dimension mismatch: {len(vec1)} vs {len(vec2)}")
    # ... compute similarity
```

Let the caller decide how to handle the error.

---

### 7. LLM Provider Cascade Without Circuit Breaker

**File:** `services/llm_service.py` (lines 50–95)

```python
async def generate_text(self, prompt: str, ...) -> str:
    last_error = None
    for provider in self.providers:
        try:
            response = await provider["client"].chat.completions.create(...)
            return response.choices[0].message.content
        except Exception as e:
            last_error = e
            continue
    raise Exception(f"All LLM providers failed. Last error: {last_error}")
```

**Impact:**

- If provider 1 is down, every request still tries it first (adds latency)
- No circuit breaker — a down provider is retried indefinitely
- No metrics on which providers are failing
- No exponential backoff between provider attempts

**Recommended Fix:**

```python
import time

class ProviderState:
    def __init__(self):
        self.failures = 0
        self.last_failure = 0
        self.circuit_open = False

    def record_failure(self):
        self.failures += 1
        self.last_failure = time.time()
        if self.failures >= 3:
            self.circuit_open = True

    def is_available(self) -> bool:
        if not self.circuit_open:
            return True
        # Allow retry after 60 seconds
        if time.time() - self.last_failure > 60:
            self.circuit_open = False
            self.failures = 0
            return True
        return False

    def record_success(self):
        self.failures = 0
        self.circuit_open = False

# In UnifiedLLMClient
for provider in self.providers:
    if not provider["state"].is_available():
        continue
    try:
        response = await provider["client"].chat.completions.create(...)
        provider["state"].record_success()
        return response.choices[0].message.content
    except Exception as e:
        provider["state"].record_failure()
        last_error = e
        continue
```

---

### 8. Misleading Retry Decorator

**File:** `services/llm_service.py` (line 102)

```python
@retry(stop=stop_after_attempt(1))  # Only 1 attempt!
async def generate_completion(prompt: str, ...):
    return await llm_client.generate_text(...)
```

**Impact:** The `@retry(stop=stop_after_attempt(1))` decorator means "try once, no retries." This is:

- Misleading — suggests retry logic exists when it doesn't
- Confusing — `generate_text` internally loops through providers, so it looks like there are two retry layers
- Dead code — does nothing useful

**Recommended Fix:**

Either make it meaningful:

```python
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((TimeoutError, ConnectionError)),
)
async def generate_completion(prompt: str, ...):
    return await llm_client.generate_text(...)
```

Or remove it entirely and let `generate_text`'s internal provider cascade handle failures.

---

## Priority

| #   | Issue                                | Severity | Effort |
| --- | ------------------------------------ | -------- | ------ |
| 1   | Duplicate application race condition | High     | Low    |
| 2   | Lambda closure bug risk              | Low      | Low    |
| 3   | Silent background failures           | High     | Medium |
| 4   | Streaming without limits             | High     | Medium |
| 5   | Dummy vector fallback                | High     | Low    |
| 6   | Dimension mismatch silent            | Medium   | Low    |
| 7   | No circuit breaker                   | Medium   | Medium |
| 8   | Misleading retry decorator           | Low      | Low    |

# 07 — Reliability & Resilience

## Summary

The backend lacks resilience patterns needed for production: race conditions allow duplicate data, background tasks fail silently, LLM fallbacks mask errors with fake data, streaming endpoints have no backpressure or timeout, and closure bugs in async code could cause unpredictable behavior.

---

## Issues

### 1. Duplicate Application Race Condition

**File:** `routers/applications.py` (lines 108–118)

```python
# Check if already applied
existing = supabase.table("applied_internships").select("*") \
    .eq("user_id", payload.user_id) \
    .eq("internship_id", payload.internship_id).execute()

if existing.data:
    return {"success": True, "message": "Already applied."}

# ... compute match score ...

# Insert new application
supabase.table("applied_internships").insert({...}).execute()
```

**Impact:** If a user clicks "Apply" twice quickly, both requests pass the `existing` check before either inserts. Result: duplicate applications in the database.

**Recommended Fix:**

Option A — Database unique constraint (preferred):

```sql
ALTER TABLE applied_internships
ADD CONSTRAINT unique_user_internship
UNIQUE (user_id, internship_id);
```

```python
try:
    supabase.table("applied_internships").insert({...}).execute()
except Exception as e:
    if "unique" in str(e).lower() or "duplicate" in str(e).lower():
        return {"success": True, "message": "Already applied."}
    raise
```

Option B — Upsert:

```python
supabase.table("applied_internships").upsert(
    {...},
    on_conflict="user_id,internship_id"
).execute()
```

---

### 2. Closure Bug in asyncio.to_thread Lambdas

**File:** `routers/admin.py` (lines 15–18)

```python
tasks = [
    asyncio.to_thread(lambda: supabase.table("profiles").select("id", count="exact").eq("role", "student").execute()),
    asyncio.to_thread(lambda: supabase.table("internships").select("id", count="exact").execute()),
    asyncio.to_thread(lambda: supabase.table("applied_internships").select("id", count="exact").execute())
]
results = await asyncio.gather(*tasks)
```

**Impact:** In Python, lambda closures capture variables by reference, not by value. In this specific case, since each lambda has hardcoded strings, it's technically safe. However, if any lambda referenced a loop variable, all would use the same value. This is a fragile pattern that breaks easily during refactoring.

**Recommended Fix:**

Use `functools.partial` or named functions:

```python
from functools import partial

def _count_table(table: str, **filters):
    query = supabase.table(table).select("id", count="exact")
    for key, value in filters.items():
        query = query.eq(key, value)
    return query.execute()

tasks = [
    asyncio.to_thread(partial(_count_table, "profiles", role="student")),
    asyncio.to_thread(partial(_count_table, "internships")),
    asyncio.to_thread(partial(_count_table, "applied_internships")),
]
```

---

### 3. Background Match Processing — No Retry or Status Tracking

**File:** `routers/cv.py` (lines 27–44)

```python
async def process_matches_in_background(user_id: str, cv_text: str, internships: list):
    try:
        # Compute embeddings, calculate scores, store results
        ...
    except Exception as e:
        logger.error(f"Background match processing failed for user {user_id}: {e}")
        # Complete silence — user sees stale/empty results forever
```

**Impact:**

- No retry mechanism — a transient network error permanently prevents matching
- No status tracking — user has no visibility into progress or failure
- No alerting — team doesn't know matching is broken
- No idempotency — cannot safely retry without duplicate results

**Recommended Fix:**

```python
# Add status tracking
async def process_matches_in_background(user_id: str, cv_text: str, internships: list):
    max_retries = 3

    for attempt in range(max_retries):
        try:
            # Update status to "processing"
            await asyncio.to_thread(
                lambda: supabase.table("profiles").update({"match_status": "processing"}).eq("id", user_id).execute()
            )

            # ... compute matches ...

            # Update status to "completed"
            await asyncio.to_thread(
                lambda: supabase.table("profiles").update({
                    "match_status": "completed",
                    "last_matched_at": datetime.utcnow().isoformat()
                }).eq("id", user_id).execute()
            )
            return  # Success

        except Exception as e:
            logger.error(f"Match processing attempt {attempt + 1}/{max_retries} failed for {user_id}: {e}")
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff

    # All retries exhausted
    await asyncio.to_thread(
        lambda: supabase.table("profiles").update({
            "match_status": "failed",
            "match_error": "Processing failed after multiple attempts. Please re-upload your CV."
        }).eq("id", user_id).execute()
    )
```

---

### 4. Embedding Fallback Returns Fake Vectors

**File:** `services/routing_service.py` (lines 39–40)

```python
except Exception as e:
    logger.error(f"Embedding failed: {e}. Falling back to 50% match.")
    cv_emb, job_emb = [1.0], [0.0]  # Fake vectors — cosine similarity = 0
```

**Impact:** When the embedding service fails:

- All users get a 0% match score instead of an error
- Users see "No good matches" when really the service is broken
- No distinction between "genuinely low match" and "system failure"
- Results in wrong career decisions based on fake data

**Recommended Fix:**

```python
except Exception as e:
    logger.error(f"Embedding failed for user: {e}", exc_info=True)
    # Return None to signal failure — let caller handle
    return None

# In the caller
match_result = await compute_match(cv_text, job_text)
if match_result is None:
    # Store with explicit "failed" flag
    result = {
        "match_score": None,
        "status": "embedding_failed",
        "error": "Could not compute match — AI service unavailable"
    }
```

---

### 5. Streaming Endpoint — No Timeout or Backpressure

**File:** `routers/applications.py` (lines 68–88)

```python
return StreamingResponse(
    generate_cover_letter_stream(...),
    media_type="text/plain"
)
```

**Impact:**

- If the LLM hangs, the connection stays open indefinitely
- If the client disconnects, server may keep generating
- No limit on how many concurrent streams one user can open
- Memory grows if client is slow to consume chunks

**Recommended Fix:**

```python
import asyncio

async def generate_cover_letter_stream_with_timeout(prompt: str, timeout: float = 60.0):
    """Wraps LLM stream with timeout and cancellation."""
    try:
        async with asyncio.timeout(timeout):
            async for chunk in llm_client.generate_text_stream(prompt):
                yield chunk
    except asyncio.TimeoutError:
        yield "\n\n[Generation timed out. Please try again.]"
    except asyncio.CancelledError:
        # Client disconnected
        logger.info("Client disconnected during stream generation")
        return

@router.post("/draft-cover-letter-stream")
async def draft_cover_letter_stream(...):
    return StreamingResponse(
        generate_cover_letter_stream_with_timeout(prompt, timeout=60.0),
        media_type="text/plain",
        headers={"X-Stream-Timeout": "60"}
    )
```

---

### 6. LLM Provider Cascade — Silent Fallthrough

**File:** `services/llm_service.py` (lines 70–79)

```python
async def generate_text_stream(self, prompt: str, ...):
    last_error = None
    for provider in self.providers:
        try:
            # ... attempt streaming from this provider
            return
        except Exception as e:
            last_error = e
            continue  # Try next provider silently

    # All failed
    yield f"All LLM providers failed. Last error: {last_error}"
```

**Impact:**

- Error message is yielded as if it were generated text — client displays it as content
- No HTTP error status code — client thinks generation succeeded
- No logging of which providers failed and why
- Cannot distinguish "all providers down" from partial responses

**Recommended Fix:**

```python
async def generate_text_stream(self, prompt: str, ...):
    errors = []
    for provider in self.providers:
        try:
            async for chunk in self._stream_from_provider(provider, prompt):
                yield chunk
            return  # Successfully completed
        except Exception as e:
            errors.append(f"{provider['name']}: {e}")
            logger.warning(f"LLM provider {provider['name']} failed: {e}")
            continue

    # All failed — raise instead of yielding error text
    error_summary = "; ".join(errors)
    logger.error(f"All LLM providers failed: {error_summary}")
    raise LLMServiceUnavailable(f"All AI providers are currently unavailable.")

# In router — catch and return proper error
@router.post("/draft-cover-letter-stream")
async def draft_cover_letter_stream(...):
    try:
        return StreamingResponse(llm_client.generate_text_stream(prompt), ...)
    except LLMServiceUnavailable:
        raise HTTPException(status_code=503, detail="AI service is temporarily unavailable.")
```

---

### 7. Vector Dimension Mismatch — Silent Zero Score

**File:** `services/matching_service.py` (lines 72–75)

```python
def compute_cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
    if not vec1 or not vec2:
        return 0.0
    if len(vec1) != len(vec2):
        logger.warning("Vector dimension mismatch...")
        return 0.0  # Silently returns 0
```

**Impact:** If the embedding model changes or returns truncated vectors, all match scores silently become 0. Users see "No matches" with no explanation. The warning log is easy to miss.

**Recommended Fix:**

```python
class VectorDimensionError(Exception):
    pass

def compute_cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
    if not vec1 or not vec2:
        raise ValueError("Empty vector provided for similarity computation")
    if len(vec1) != len(vec2):
        raise VectorDimensionError(
            f"Dimension mismatch: vec1={len(vec1)}, vec2={len(vec2)}. "
            "Embedding model may have changed."
        )
    # ... compute similarity
```

---

### 8. PDF URL Parsing — Fragile String Manipulation

**File:** `routers/cv.py` (lines 200–220)

```python
if "cvs/" in url:
    parts = url.split("cvs/")
    if len(parts) > 1:
        filename = parts[1].split("?")[0]
```

**Impact:** This string parsing breaks if:

- URL contains "cvs/" elsewhere in the path
- Filename contains special characters or spaces
- Supabase changes their URL format
- URL is double-encoded

**Recommended Fix:**

```python
from urllib.parse import urlparse, unquote

def extract_storage_path(url: str, bucket: str = "cvs") -> str | None:
    """Safely extract file path from Supabase storage URL."""
    parsed = urlparse(url)
    path = unquote(parsed.path)

    bucket_marker = f"/object/public/{bucket}/"
    if bucket_marker in path:
        return path.split(bucket_marker, 1)[1]

    # Fallback for signed URLs
    bucket_marker = f"/object/sign/{bucket}/"
    if bucket_marker in path:
        return path.split(bucket_marker, 1)[1]

    return None
```

---

## Priority

| #   | Issue                                | Severity | Effort |
| --- | ------------------------------------ | -------- | ------ |
| 1   | Duplicate application race condition | High     | Low    |
| 2   | Lambda closure risk                  | Low      | Low    |
| 3   | No retry in background tasks         | High     | Medium |
| 4   | Fake vector fallback                 | High     | Medium |
| 5   | Streaming no timeout                 | High     | Low    |
| 6   | LLM error yielded as text            | High     | Medium |
| 7   | Silent dimension mismatch            | Medium   | Low    |
| 8   | Fragile URL parsing                  | Medium   | Low    |
