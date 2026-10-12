# Audit Report: Agent 08 (Platform & Database Foundation)

**Branch**: `agent/08-platform-db`  
**Date**: October 12, 2026  
**Agent**: Agent 08 — Platform, Database Schema, RLS, Backend Core & Test Harness  

---

## 1. Feature Checklist

| Component / Feature | Scope | Status | Notes |
| :--- | :--- | :---: | :--- |
| **Migration Architecture** | DB | 🔧 Fixed | Identified authoritative migration directory (`frontend/pau-interconnect-app/supabase/migrations/`), audited 38 total migration files across frontend & backend, documented schema overlap, and surfaced corrupted Python code in legacy migration. |
| **Schema & Table Completeness** | DB | 🔧 Fixed | Created missing `match_results` table in hardening migration to satisfy vector matching queries in backend/frontend without runtime errors. |
| **Database RLS Hardening** | DB / Security | 🔧 Fixed | Enabled RLS on 7 previously unprotected tables (`conversations`, `messages`, `application_stage_history`, `decision_audit_log`, `internship_templates`, `company_followers`, `match_results`). Restricted overly broad SELECT policies on `saved_internships`, `liked_internships`, and `internships`. |
| **Database Query Indexing** | DB / Perf | 🔧 Fixed | Created 24 high-performance B-tree indexes covering all foreign keys and hot filter/sort columns (`student_id`, `employer_id`, `status`, `created_at`). |
| **Backend CORS Configuration** | Backend / Security | 🔧 Fixed | Normalized origins list, added regex for `localhost` variations, exposed `X-Request-ID` and standard pagination headers, prevented wildcards in production. |
| **Payload Size Limits** | Backend / Security | 🔧 Fixed | Configured 15MB max request body middleware returning `413 Payload Too Large` to prevent memory exhaustion and DoS. |
| **Exception Sanitization** | Backend / Security | 🔧 Fixed | Added structured exception handlers preventing stack trace / server path leaks, generating correlated UUID error IDs for debugging. |
| **Async Non-Blocking DB Calls** | Backend / Perf | 🔧 Fixed | Converted sync `supabase` client calls in `/ready` and `/test-supabase` to `asyncio.to_thread` to prevent event-loop starvation under load. |
| **Production Health Protection** | Backend / Security | 🔧 Fixed | Guarded `/test-supabase` debug endpoint to return `404 Not Found` when `ENVIRONMENT = "production"`. |
| **In-Memory Cache Service** | Backend / Core | 🔧 Fixed | Fixed LRU capacity eviction bug where updating existing keys erroneously popped valid entries; added explicit `delete()` and `clear()` methods and safe JSON serialization. |
| **Rate Limiting Engine** | Backend / Security | 🔧 Fixed | Implemented `rate_limit_ip` for unauthenticated client endpoints alongside existing user token rate limiter; added automated cleanup in test harness. |
| **Backend Config Validation** | Backend / Core | 🔧 Fixed | Added startup diagnostics and production safety validation in `core/config.py` rejecting insecure `FRONTEND_URL = "*"` when `ENVIRONMENT = "production"`. |
| **Shared Pytest Harness** | Backend / Testing | 🔧 Fixed | Created `backend/tests/conftest.py` with reusable fixtures: `client`, mock Supabase client with chainable query simulation, mock storage, auth fixtures and valid JWT headers for `student`, `employer`, and `admin`. |
| **Backend Test Suite Migration** | Backend / Testing | 🔧 Fixed | Converted `backend/test_main_api.py` into mocked unit tests running in <0.5s; migrated live network tests to `backend/tests/integration/test_main_api_live.py` behind `RUN_LIVE_TESTS=1`. |
| **Frontend Env & Config Validation**| Frontend / Core | 🔧 Fixed | Added strict runtime validation in `lib/env.ts` for app URL, backend URL, Supabase credentials, and Brevo email configuration; created `.env.example` and health verification script. |
| **Frontend API Client & Error Shapes** | Frontend / Core | 🔧 Fixed | Normalized backend URL resolution in `lib/api.ts` and `lib/api-server.ts`, eliminated leading/trailing slash double-joining bugs, strictly typed `toApiErrorMessage` in `types/api.ts`. |
| **Frontend Supabase Server Guard** | Frontend / Core | 🔧 Fixed | Enforced fail-fast validation in `lib/supabase-server.ts` before creating Supabase SSR cookies client. |
| **Root CI Pipeline** | CI / Automation | 🔧 Fixed | Created `.github/workflows/ci.yml` running dual parallel matrix: Frontend (`lint`, `typecheck`, `test`, `build`) and Backend (`python 3.11`, `requirements.txt`, `pytest tests/ -v`). |
| **Render Deployment Spec** | Deployment | 🔧 Fixed | Updated `render.yaml` with `--workers 2`, environment variable mappings for production safety, and persistent health checks. |

---

## 2. Bugs Fixed

| # | Bug Description | Location | Commit |
|---|-----------------|----------|--------|
| 1 | **Missing `match_results` table in migrations**: Backend and frontend queried `match_results` table, but no migration created it, resulting in runtime DB errors on fresh databases. | `frontend/pau-interconnect-app/supabase/migrations/20261013080000_08_platform_rls_hardening.sql:1-25` | `604d2e4` |
| 2 | **Unprotected sensitive tables without RLS**: `conversations`, `messages`, `application_stage_history`, `decision_audit_log`, `internship_templates`, `company_followers`, and `match_results` had RLS disabled or lacked student/employer scoping policies. | `frontend/pau-interconnect-app/supabase/migrations/20261013080000_08_platform_rls_hardening.sql:27-140` | `604d2e4` |
| 3 | **Overly broad public SELECT policies**: `saved_internships` and `liked_internships` allowed any user to read other users' bookmarks and likes; `internships` leaked `draft` and `deleted` postings to unauthenticated callers. | `frontend/pau-interconnect-app/supabase/migrations/20261013080000_08_platform_rls_hardening.sql:142-178` | `604d2e4` |
| 4 | **Missing Foreign Key & Filter Indexes**: Hot foreign key joins (`student_id`, `employer_id`, `internship_id`, `conversation_id`) and status filters had no indexes, forcing sequential table scans as tables grow. | `frontend/pau-interconnect-app/supabase/migrations/20261013080000_08_platform_rls_hardening.sql:180-245` | `604d2e4` |
| 5 | **Unbounded Request Payload (DoS vulnerability)**: FastAPI application accepted unlimited body sizes, exposing memory exhaustion risks during upload endpoints. Fixed with 15MB middleware returning `413 Payload Too Large`. | `backend/main.py:59-71` | `953d21d` |
| 6 | **Information Leakage via Unhandled Exceptions**: 500 handler returned raw exception traces or internal paths to clients. Added UUID error correlation tracking and sanitized user-facing messages. | `backend/main.py:73-86` | `953d21d` |
| 7 | **Event Loop Starvation via Synchronous DB Calls**: `/ready` and `/test-supabase` executed synchronous Supabase PostgREST network calls directly inside async route handlers. Wrapped in `await asyncio.to_thread(...)`. | `backend/routers/system.py:27, 43` | `953d21d` |
| 8 | **Debug Endpoint Exposed in Production**: `/test-supabase` provided database probe access in production without authentication. Enforced 404 lockout when `ENVIRONMENT == "production"`. | `backend/routers/system.py:38-41` | `953d21d` |
| 9 | **Cache Eviction Logic Flaw**: `CacheService.set` triggered eviction based on `len(self._store) >= maxsize` without checking if the target key was already present, causing premature eviction of unrelated keys on update. | `backend/services/cache_service.py:31-41` | `953d21d` |
| 10 | **Wildcard CORS Permitted in Production**: `core/config.py` allowed `FRONTEND_URL = "*"` even in production configurations, exposing auth cookies to cross-origin abuse. Added `validate_production_safety` validator. | `backend/core/config.py:33-40` | `953d21d` |
| 11 | **Flaky / Network-Dependent Legacy Tests**: `backend/test_main_api.py` contained hard-coded credentials and hit remote Supabase endpoints, breaking CI without remote network access. Converted to mocked unit tests and segregated live test. | `backend/test_main_api.py:1-120` | `3cc8453` |
| 12 | **Frontend URL Normalization Bugs**: `lib/api.ts` and `lib/api-server.ts` statically cached backend URLs and had string concatenation issues with leading slashes (`//api/...`). Rewrote resolution with dynamic evaluation and clean URL parsing. | `frontend/pau-interconnect-app/lib/api.ts:25-36`, `frontend/pau-interconnect-app/lib/api-server.ts:1-25` | `f65a9f7` |
| 13 | **Unsound Error Shape Parsing**: `toApiErrorMessage` accepted `any` and failed on non-standard backend error envelopes. Hardened to handle Pydantic validation errors (`detail: [{msg, loc}]`), strings, and structured objects. | `frontend/pau-interconnect-app/types/api.ts:32-47` | `f65a9f7` |
| 14 | **Missing Root CI Backend Pipeline**: Root `.github/workflows/ci.yml` was absent, leaving backend tests unverified on pull requests and pushes. Created dual-job workflow. | `.github/workflows/ci.yml:1-85` | `f65a9f7` |
| 15 | **Corrupted Migration File**: `frontend/pau-interconnect-app/supabase/migrations/20260223000000_create_profiles.sql` contains pasted Python code instead of SQL. Flagged in migration audit and handoffs. | `frontend/pau-interconnect-app/supabase/migrations/20260223000000_create_profiles.sql:1-4` | Audited (Handoff) |

---

## 3. Tests Added & Execution Results

### 3.1 Backend Tests (`backend/tests/`)
Created comprehensive test suite covering the shared harness, configuration validation, security headers, rate limiting, cache service, and API endpoints:
- `backend/tests/conftest.py`: Shared harness, TestClient, mock Supabase client, auth headers.
- `backend/tests/platform/test_harness.py`: Fixture verification, query chaining, storage mocks.
- `backend/tests/platform/test_config.py`: Settings validation, URL format checks, production CORS safety.
- `backend/tests/platform/test_security_cors_ratelimit.py`: CORS preflight, `X-Request-ID`, 15MB payload rejection, IP rate limiting, sanitized exceptions.
- `backend/tests/platform/test_cache_service.py`: TTL expiry, capacity eviction, delete and clear operations.
- `backend/tests/platform/test_main_api.py`: Mocked upload, MIME type validation, mismatched user detection, system health.
- `backend/tests/integration/test_main_api_live.py`: Isolated live test (skipped unless `RUN_LIVE_TESTS=1`).

**Execution Command**:
```bash
cd backend && .venv/bin/pytest tests/ -v
```

**Output**:
```text
============================= test session starts ==============================
platform darwin -- Python 3.11.8, pytest-9.1.1, pluggy-1.6.0 -- backend/.venv/bin/python3
cachedir: .pytest_cache
rootdir: /Users/.../backend
configfile: pytest.ini
plugins: asyncio-1.4.0, anyio-4.15.1
collected 28 items

tests/integration/test_main_api_live.py::test_live_supabase_connection SKIPPED [  3%]
tests/platform/test_cache_service.py::test_cache_set_and_get PASSED      [  7%]
tests/platform/test_cache_service.py::test_cache_ttl_expiry PASSED       [ 10%]
tests/platform/test_cache_service.py::test_cache_lru_eviction PASSED     [ 14%]
tests/platform/test_cache_service.py::test_cache_delete_and_clear PASSED [ 17%]
tests/platform/test_config.py::test_valid_settings_creation PASSED       [ 21%]
tests/platform/test_config.py::test_missing_required_settings PASSED     [ 25%]
tests/platform/test_config.py::test_invalid_supabase_url PASSED          [ 28%]
tests/platform/test_config.py::test_service_key_too_short PASSED         [ 32%]
tests/platform/test_config.py::test_wildcard_cors_rejected_in_production PASSED [ 35%]
tests/platform/test_config.py::test_startup_diagnostics_runs_cleanly PASSED [ 39%]
tests/platform/test_harness.py::test_public_system_endpoints PASSED      [ 42%]
tests/platform/test_harness.py::test_ready_endpoint_with_mock_db PASSED  [ 46%]
tests/platform/test_harness.py::test_auth_fixtures_and_headers PASSED    [ 50%]
tests/platform/test_harness.py::test_mock_supabase_query PASSED          [ 53%]
tests/platform/test_harness.py::test_mock_supabase_storage PASSED        [ 57%]
tests/platform/test_main_api.py::test_happy_path_upload_and_fetch PASSED [ 60%]
tests/platform/test_main_api.py::test_upload_invalid_file_type PASSED    [ 64%]
tests/platform/test_main_api.py::test_upload_with_mismatched_user_id PASSED [ 67%]
tests/platform/test_main_api.py::test_supabase_connection_endpoint PASSED [ 71%]
tests/platform/test_main_api.py::test_ready_endpoint PASSED              [ 75%]
tests/platform/test_security_cors_ratelimit.py::test_cors_headers_with_allowed_origin PASSED [ 78%]
tests/platform/test_security_cors_ratelimit.py::test_x_request_id_generated_and_exposed PASSED [ 82%]
tests/platform/test_security_cors_ratelimit.py::test_payload_too_large_rejection PASSED [ 85%]
tests/platform/test_security_cors_ratelimit.py::test_rate_limiting_dependency_enforcement PASSED [ 89%]
tests/platform/test_security_cors_ratelimit.py::test_rate_limiting_ip_dependency PASSED [ 92%]
tests/platform/test_security_cors_ratelimit.py::test_test_supabase_disabled_in_production PASSED [ 96%]
tests/platform/test_security_cors_ratelimit.py::test_unhandled_exception_does_not_leak_traces PASSED [100%]

================== 27 passed, 1 skipped, 2 warnings in 0.49s ===================
```

---

### 3.2 Frontend Tests & Lint Checks
**Commands Run**:
```bash
cd frontend/pau-interconnect-app
npm run lint
npm run typecheck
npm run test
npm run build
```

**Results**:
- **Lint**: 0 errors, 55 warnings (all pre-existing in untouched areas).
- **Typecheck (`tsc --noEmit`)**: 0 errors.
- **Unit Tests (`vitest run`)**:
  - `tests/lib/env.test.ts` (3 tests passed)
  - `tests/lib/api-error.test.ts` (4 tests passed)
  - `tests/lib/post-login.test.ts` (4 tests passed)
  - `tests/lib/placements.test.ts` (1 test passed)
  - `tests/lib/logbook-dates.test.ts` (5 tests passed)
  - `tests/lib/email.test.ts` (4 tests passed)
  - **Total**: 6 test files, 21 tests passed (0 failures).
- **Next.js 16 Build**: Successfully compiled 37 static and dynamic routes.

---

## 4. Migration Architecture & Schema Map

### 4.1 Authoritative Directory Decision
There were two migration locations:
1. `backend/supabase/migrations/` (4 files, legacy vector schema setup)
2. `frontend/pau-interconnect-app/supabase/migrations/` (34 files, core schema and application tables)

**Decision**: `frontend/pau-interconnect-app/supabase/migrations/` is designated as the **single authoritative source of truth**. All future database changes must be added here as timestamped migrations (`20261013<NN>MMSS_<agent>_<desc>.sql`).

### 4.2 Migration Audit & Issues Detected
1. **Critical Syntax Bug**: `20260223000000_create_profiles.sql` contains pasted Python code (`# backend/main.py\nfrom fastapi import FastAPI...`) rather than SQL statements. The actual profiles schema was re-applied later in `20260801_consolidated_migrations.sql`.
2. **Duplicate Migrations**: `20260729_*` migrations were duplicated inside `20260801_consolidated_migrations.sql` and `20260801_consolidated_migrations_fixed.sql`.
3. **Non-Timestamped Files**: `add_company_banner_url.sql` and `create_logbook_table.sql` exist without timestamps.

### 4.3 Database Schema Map

| Table Name | Primary Columns | RLS Enabled? | Policies Summary | Foreign Keys & Hot Indexes |
| :--- | :--- | :---: | :--- | :--- |
| `profiles` | `id (UUID PK)`, `email`, `role`, `full_name`, `bio`, `created_at` | ✅ Yes | Self-select, self-update, public read-limited, admin full | `id -> auth.users`, index on `role` |
| `student_profiles` | `id`, `user_id`, `matric_no`, `department`, `level`, `cgpa`, `skills` | ✅ Yes | Student self-read/update, employer view verified, admin all | `user_id -> profiles(id)` (indexed) |
| `employer_profiles`| `id`, `user_id`, `company_name`, `industry`, `is_verified` | ✅ Yes | Public verified read, employer self-update, admin all | `user_id -> profiles(id)` (indexed) |
| `internships` | `id`, `employer_id`, `title`, `description`, `status`, `created_at` | ✅ Yes | Public view `published`, employer manage own, admin all | `employer_id` (indexed), `status` (indexed) |
| `applications` | `id`, `internship_id`, `student_id`, `status`, `stage`, `created_at` | ✅ Yes | Student view own, employer view received, admin all | `internship_id`, `student_id` (indexed) |
| `application_stage_history` | `id`, `application_id`, `from_stage`, `to_stage`, `changed_by` | ✅ Hardened | Participant (student/employer) read, updater write | `application_id` (indexed), `changed_by` |
| `decision_audit_log` | `id`, `application_id`, `actor_id`, `decision`, `reason`, `created_at`| ✅ Hardened | Participant view, actor insert, admin audit read | `application_id` (indexed), `actor_id` |
| `logbook_entries` | `id`, `student_id`, `placement_id`, `week_number`, `day_of_week`, `status`| ✅ Yes | Student manage own, supervisor view approved placement | `student_id` (indexed), `placement_id` |
| `placements` | `id`, `student_id`, `internship_id`, `employer_id`, `status` | ✅ Yes | Student read own, employer read own, admin manage | `student_id`, `internship_id`, `employer_id` (indexed) |
| `saved_internships` | `id`, `user_id`, `internship_id`, `created_at` | ✅ Hardened | Restricted to owner `user_id = auth.uid()` | `user_id`, `internship_id` (indexed) |
| `liked_internships` | `id`, `user_id`, `internship_id`, `created_at` | ✅ Hardened | Restricted to owner `user_id = auth.uid()` | `user_id`, `internship_id` (indexed) |
| `conversations` | `id`, `student_id`, `employer_id`, `updated_at`, `created_at` | ✅ Hardened | Participant read/create (`student_id` or `employer_id`) | `student_id`, `employer_id` (indexed) |
| `messages` | `id`, `conversation_id`, `sender_id`, `content`, `read_at`, `created_at` | ✅ Hardened | Conversation participant read/insert | `conversation_id` (indexed), `sender_id` |
| `internship_templates` | `id`, `employer_id`, `title`, `template_data`, `created_at` | ✅ Hardened | Employer manage own templates | `employer_id` (indexed) |
| `company_followers` | `id`, `student_id`, `employer_id`, `created_at` | ✅ Hardened | Student manage own follows, employer read followers | `student_id`, `employer_id` (indexed) |
| `match_results` | `id`, `student_id`, `internship_id`, `score`, `reason`, `updated_at` | ✅ Hardened | Student read own matches, employer read applicants | `student_id`, `internship_id` (indexed) |

---

### 4.4 New Platform Migration
**Filename**: `frontend/pau-interconnect-app/supabase/migrations/20261013080000_08_platform_rls_hardening.sql`  
**What it does**:
1. Creates the `match_results` table if not exists with proper foreign keys (`student_id`, `internship_id`), unique constraint `(student_id, internship_id)`, and `updated_at` trigger.
2. Enables Row Level Security on all 7 unshielded tables.
3. Implements idempotent RLS policies for:
   - `conversations` (participants can view and create conversations).
   - `messages` (participants of parent conversation can read and insert messages).
   - `application_stage_history` (applicant and employer can view stage progress).
   - `decision_audit_log` (applicant, employer, and admins can view immutable audit logs).
   - `internship_templates` (employers have full CRUD over their own templates).
   - `company_followers` (students can follow/unfollow; employers can read followers).
   - `match_results` (students can inspect their matching scores).
4. Hardens existing policies:
   - Drops `saved_internships` and `liked_internships` public access policies, replacing them with strict owner checks.
   - Enforces status restriction on `internships` SELECT so unauthenticated callers only see `published` listings.
5. Adds 24 performance indexes across foreign keys and hot query columns to eliminate sequential table scans.

---

## 5. Handoffs to Other Area Agents

| Target Agent | File / Topic | Requested Action & Rationale |
| :--- | :--- | :--- |
| **Agent 01 (Auth)** | `frontend/.../migrations/20260223000000_create_profiles.sql` | When consolidating legacy migrations, note that `20260223000000_create_profiles.sql` contains pasted Python code instead of SQL. Do not run it standalone. |
| **Agent 02 (AI / CV)** | `match_results` table & `services/vector_service.py` | The `match_results` table is now formally defined in migration `20261013080000_08_platform_rls_hardening.sql`. Use `student_id` and `internship_id` with `on_conflict="student_id,internship_id"` for upserts. |
| **Agent 03 (Discovery)** | `internships`, `saved_internships`, `liked_internships` | RLS now enforces `status = 'published'` for unauthenticated public viewers. Ensure any employer draft previews query with the employer's authenticated session. |
| **Agent 04 (Applications)** | `application_stage_history`, `decision_audit_log` | RLS is enabled on these audit tables. Insert operations must provide `changed_by = auth.uid()` or use the server-side service role key. |
| **Agent 06 (Employer)** | `internship_templates` | RLS requires `employer_id = auth.uid()`. When creating templates, ensure `employer_id` matches the authenticated user ID. |
| **Agent 07 (Messaging)** | `conversations`, `messages` | Both tables now enforce participant checks via RLS. Next.js API routes or Supabase clients can query directly with the user's session without risk of data leakage. |
| **All Agents** | `backend/tests/conftest.py` | The shared pytest harness is ready for all backend tests. Use `client`, `mock_supabase`, `student_headers`, `employer_headers`, and `admin_headers` fixtures. |

---

## 6. Manual Test Steps (Browser & Curl Verification)

### Step 1: Health & Readiness Check
1. Start the backend: `cd backend && .venv/bin/uvicorn main:app --port 8000`
2. Run curl for system health:
   ```bash
   curl -i http://localhost:8000/ready
   curl -i http://localhost:8000/health
   ```
3. **Verify**: Both return HTTP 200 with `{"status": "ready"}` and `{"status": "ok"}`.
4. Verify debug lockout in production:
   ```bash
   ENVIRONMENT=production curl -i http://localhost:8000/test-supabase
   ```
5. **Verify**: Returns HTTP 404 Not Found in production mode.

### Step 2: Payload Size Rejection
1. Send a request with a body exceeding 15MB:
   ```bash
   python3 -c "import urllib.request; req = urllib.request.Request('http://localhost:8000/upload-and-analyze', data=b'0'*16000000, headers={'Content-Type': 'multipart/form-data; boundary=xxx'}); urllib.request.urlopen(req)"
   ```
2. **Verify**: Returns HTTP 413 Payload Too Large with clean JSON error message.

### Step 3: CORS & Request ID Headers
1. Send an OPTIONS preflight request:
   ```bash
   curl -i -X OPTIONS http://localhost:8000/health \
     -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET"
   ```
2. **Verify**: Response includes `access-control-allow-origin: http://localhost:3000`, `access-control-allow-credentials: true`, and `x-request-id` in exposed headers.

### Step 4: Frontend API & Environment Validation
1. Start frontend development server: `cd frontend/pau-interconnect-app && npm run dev`
2. Open `http://localhost:3000` in browser.
3. Test environment validator:
   ```bash
   npm run check-env
   ```
4. **Verify**: Script exits with code 0 reporting valid environment configuration.

### Step 5: Database RLS Enforcement Verification
1. Log in as a student user (`student@pau.edu.ng`).
2. Attempt to fetch another user's bookmarks via Supabase client:
   ```typescript
   const { data } = await supabase.from('saved_internships').select('*');
   ```
3. **Verify**: The returned dataset contains strictly bookmarks where `user_id == current_student_id`. Attempting to read another user's messages or bookmarks returns empty results rather than unauthorized rows.
