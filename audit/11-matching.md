# Audit Report: Agent 11 — Unified Fresh Profile ↔ Internship Matching Pipeline

**Branch**: `agent/11-matching`  
**Date**: October 12, 2026  
**Status**: Complete  

---

## 1. What Was Changed and Why

### The Problem
Previously, match percentages across PAU Interconnect suffered from systemic synchronization, latency, and correctness issues:
1. **Truncated scoring**: Vector matching only scored the top 15 most similar internships (`TOP_K = 15`), causing any open internship outside the top 15 to disappear or render as "0%".
2. **Delete-then-insert race conditions**: Re-matching deleted all of a student's `match_results` rows before computing and inserting new scores, causing scores to flicker away while jobs ran.
3. **Misleading 0% unscored state**: Unscored pairs rendered as "0% match" (`?? 0` in `DashboardParts.tsx`), conflating "terrible fit" with "not scored yet / no CV uploaded".
4. **Formula drift**: Score calculations were duplicated in `routing_service.compute_match_score()` and `vector_matching_service.find_top_matches_for_user()` with differing fallbacks.
5. **No deduplication on rapid edits**: Multiple profile edits queued multiple duplicate rematch jobs.
6. **Volatile posting analysis**: New postings used in-memory FastAPI `BackgroundTasks` instead of the durable job queue, risking lost jobs on server restart; editing an internship triggered no rescore.
7. **Cross-screen inconsistencies**: Student dashboard, internship details, CV skill gap, and employer applicant reviews showed conflicting numbers (or static snapshots).
8. **Unthrottled LLM calls**: AI reasoning ran on page loads or without provider outage circuit breaking, exposing the system to rate limits and quota failures.

### The Solution Architecture
A complete end-to-end redesign of the matching pipeline:
1. **Single Scoring Module (`backend/services/match_scoring.py`)**:
   - `score_pair(student_features, job_features)` implements deterministic scoring with `SCORE_VERSION = 2`.
   - Weights: 50% structured skills overlap, 35% pgvector embedding cosine similarity, 15% keyword/interest boost.
   - Deterministic instant explanations built for *every* scored pair directly from score breakdown without LLM calls.
   - `compute_inputs_hash` generates SHA-256 hashes of input features to track freshness.
2. **Full-Coverage Batch Matching with pgvector**:
   - Scores every student against every open internship (published, active, deadline in the future).
   - SQL functions `match_all_open_internships_for_student` and `match_all_students_for_internship` perform cosine distance calculations directly inside Postgres.
   - Scale target of 5,000 students × 500 internships handled efficiently via set-based SQL joins and batched upserts.
3. **Atomic Upserts with Invalidation**:
   - Upserts into `match_results` on conflict `(user_id, internship_id)`.
   - Never deletes student rows first; removes only closed/expired/deleted internship match rows via `cleanup_stale_match_results()`.
4. **Durable Queue & Deduplication (`backend/services/job_queue.py`)**:
   - Added `USER_RESCORE`, `INTERNSHIP_RESCORE`, and `MATCH_REASONING` job kinds.
   - 30-second debounce window prevents job spamming on rapid profile or posting edits.
   - Unique partial index `idx_cv_jobs_dedup_active` enforces at most one active job per subject and kind.
   - Priority queueing: User/internship rescoring runs at high priority (10), match reasoning runs at background priority (0).
5. **Two-Layer Explanation with LLM Circuit Breaker**:
   - **Layer 1 (Instant)**: Generated synchronously for every scored pair. Detailed, friendly breakdown mentioning matched skills, missing skills, and strongest fit signals.
   - **Layer 2 (AI Summary)**: Generated ahead of time for strong matches ($\ge 80\%$) via background `MATCH_REASONING` jobs.
   - **Stale hash protection**: Stored alongside `inputs_hash`. If inputs change, the AI summary is marked stale and the UI gracefully falls back to Layer 1.
   - **Provider Circuit Breaker**: If LLM providers return 402/429/quota exhaustion, reasoning jobs are paused (15-minute backoff) without failing or burning retries. Health status exposed in `/api/admin/llm-health`.
6. **Unified UI & Three-State Display (`components/match/MatchScore.tsx` & `lib/matching.ts`)**:
   - `getMatchScores` fetches canonical scores, pending job states, and explanation layers.
   - Distinct states: `scored` (badge + color band + breakdown popover), `pending` ("Calculating..."), and `unavailable` ("Upload your CV to see your match").
   - Applied across student dashboard, internship details, skill gap analysis, and employer applicant reviews.
7. **Rate-Limited New Match Notifications**:
   - Notifies students of new $\ge 80\%$ matches, capped at 3 notifications per student per 24 hours.
   - Respects user notification opt-out preferences (`new_match`, `recommendations`, `job_recommendations`).
8. **Batch Backfill Tool (`backend/backfill_match_scores.py`)**:
   - CLI script supporting `--all`, `--user <id>`, `--internship <id>`, and `--dry-run` to backfill existing data to `SCORE_VERSION = 2`.

---

## 2. Checklist of Every Page & Feature in Area

| Page / Feature | Path / Component | Status | Notes |
| :--- | :--- | :---: | :--- |
| **Deterministic Scoring Module** | `backend/services/match_scoring.py` | ✅ | `SCORE_VERSION = 2`, structured + semantic + keyword blend, instant explanation |
| **Vector Matching & Coverage** | `backend/services/vector_matching_service.py` | ✅ | Full coverage via pgvector SQL RPCs, upsert on conflict, no delete-first |
| **Durable Queue & Debounce** | `backend/services/job_queue.py` | ✅ | Deduplication with 30s debounce, priority ordering, circuit breaker |
| **LLM Circuit Breaker & Admin View** | `backend/routers/admin.py` | ✅ | 15-minute backoff on quota/credit exhaustion, exposed in `llm_health` |
| **Student Rescore Trigger** | `backend/routers/profiles.py` | ✅ | `POST /api/me/refresh-matches` enqueues `USER_RESCORE` with debounce |
| **Internship Rescore Trigger** | `backend/routers/cv.py`, Next.js route handlers | ✅ | `POST /api/analyze-new-internship` & PATCH `/api/internships/[id]` enqueue `INTERNSHIP_RESCORE` |
| **Stale Match Cleanup** | `frontend/pau-interconnect-app/app/api/internships/[id]` | ✅ | Closing, expiring, or deleting posting removes associated match rows |
| **Frontend Match Client** | `frontend/pau-interconnect-app/lib/matching.ts` | ✅ | Canonical `getMatchScores` with scored / pending / unavailable states |
| **Match Display Component** | `frontend/pau-interconnect-app/components/match/MatchScore.tsx` | ✅ | Consistent badges, color bands, popover details, "AI summary" tag |
| **Student Discovery & Dashboard** | `app/dashboard/student/DashboardParts.tsx`, `InternshipCard.tsx` | ✅ | Replaced `?? 0` with null; shows `MatchScore` component with proper states |
| **Internship Details View** | `app/internships/[id]/page.tsx` | ✅ | Uses canonical `getMatchScores`; removed ungrounded fallback |
| **Skill Gap Analysis** | `app/dashboard/student/cv/SkillGapClient.tsx` | ✅ | Shows canonical score from `match_results`; handles null gracefully |
| **Employer Applicant Pipeline** | `app/dashboard/employer/internships/[id]/page.tsx` | ✅ | Fetches fresh canonical scores from `match_results` for all applicants |
| **Employer Activity Feed** | `app/dashboard/employer/EmployerParts.tsx` | ✅ | Enriches recent applicants with live canonical `match_results` |
| **Employer Analytics** | `app/dashboard/employer/analytics/page.tsx` | ✅ | Computes average match score using canonical `match_results` |
| **New Match Notifications** | `vector_matching_service.py`, `lib/notifications.ts` | ✅ | Rate limited to 3/day for $\ge 80\%$ matches; respects user opt-outs |
| **Offline Backfill Script** | `backend/backfill_match_scores.py` | ✅ | Batch backfills existing database records with dry-run support |

---

## 3. Tests Added, Commands Run, and Results

### Tests Added
1. **Backend Test Suite (`backend/tests/matching/test_matching.py`)**:
   - `test_deterministic_score_pair_same_inputs_same_score`: Verifies exact reproducibility of score and breakdown.
   - `test_inputs_hash_changes_with_profile`: Verifies SHA-256 hash sensitivity to skill/experience updates.
   - `test_instant_explanation_generation`: Verifies Layer 1 instant explanation contains specific skills and counts.
   - `test_rescore_user_upserts_not_deletes`: Confirms upsert logic and non-destructive updates.
   - `test_job_queue_debounce_deduplication`: Confirms 30-second debounce coalescing multiple triggers.
   - `test_match_notification_rate_limiting`: Verifies 3-per-day rate limiting and opt-out filtering.
   - `test_llm_credit_exhaustion_pauses_reasoning`: Validates circuit breaker activation on 402/429.
   - `test_stale_ai_reasoning_invalidation`: Verifies AI explanation hash mismatch resets to Layer 1.
   - `test_api_endpoints_enqueue_durable_jobs`: Verifies `/api/me/refresh-matches` and `/api/analyze-new-internship` enqueue durable jobs.
2. **Frontend Vitest Suite (`frontend/pau-interconnect-app/tests/lib/matching.test.ts`)**:
   - `getScoreColorBadge`: Tests color banding for $\ge 80\%$, $60\text{--}79\%$, $40\text{--}59\%$, $<40\%$.
   - `getMatchScores`:
     - Empty internship list handling.
     - Unauthenticated / null user handling (returns `unavailable`, never `0`).
     - Scored state with rounded score and instant reasoning.
     - Stale AI reasoning invalidation when `inputs_hash !== ai_reasoning_hash`.
     - Pending state when rescoring job is queued/processing.
     - Unavailable state when unscored and idle.

### Quality Bar Commands Run & Results
1. **Frontend Tests**:
   ```bash
   cd frontend/pau-interconnect-app && npm run test
   ```
   **Result**: 18 test files passed (177 tests passed), including all 10 matching tests.

2. **Frontend Lint**:
   ```bash
   cd frontend/pau-interconnect-app && npm run lint
   ```
   **Result**: 0 errors.

3. **Frontend Typecheck**:
   ```bash
   cd frontend/pau-interconnect-app && npm run typecheck
   ```
   **Result**: 0 errors.

4. **Frontend Production Build**:
   ```bash
   cd frontend/pau-interconnect-app && NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy npx next build
   ```
   **Result**: Compiled successfully in 5.4s; all 42 routes generated cleanly.

5. **Backend Pytest**:
   ```bash
   cd backend && .venv/bin/python -m pytest -q
   ```
   **Result**: 177 passed, 1 skipped, 0 failures.

---

## 4. Migrations Added

### `frontend/pau-interconnect-app/supabase/migrations/20261014110000_11_matching_redesign.sql`
- **Idempotent Migration**:
  - Adds `score_version`, `score_breakdown`, `inputs_hash`, `instant_reasoning`, `ai_reasoning`, `ai_reasoning_hash`, `matching_skills`, `missing_skills` to `match_results`.
  - Adds `subject`, `priority`, `retry_at` to `cv_processing_jobs`.
  - Creates partial unique index `idx_cv_jobs_dedup_active` on `(subject, kind)` where `status IN ('queued', 'processing')`.
  - Creates pgvector similarity RPCs:
    - `match_all_open_internships_for_student(p_user_id UUID)`
    - `match_all_students_for_internship(p_internship_id UUID)`
  - Creates cleanup stored procedure:
    - `cleanup_stale_match_results()`

---

## 5. Handoffs

1. **Agent 06 / Employer Team**:
   - `backend/routers/applications.py`: `applied_internships.match_score` was previously captured as a static snapshot at application time. Employer UI pages (`[id]/page.tsx`, `EmployerParts.tsx`, `analytics/page.tsx`) now prioritize live canonical scores from `match_results`. We recommend eventually deprecating the static `applied_internships.match_score` snapshot column or keeping it strictly as `applied_at_score` for historical audit purposes.
2. **Agent 02 / AI CV Team**:
   - `cv_processing_jobs` now uses the generalized queue worker in `backend/services/job_queue.py` that processes `CV_ANALYSIS`, `USER_RESCORE`, `INTERNSHIP_RESCORE`, and `MATCH_REASONING` with priority scheduling. Any new job kinds should define a corresponding `JobKind` constant and register a handler in `_run()`.

---

## 6. Manual Browser Test Steps

1. **Verify Unscored State**:
   - Sign in as a newly created student without CV or profile skills.
   - Navigate to `/dashboard/student`.
   - Observe internship cards: each card displays an "Upload your CV to see your match" pill linking to `/dashboard/student/cv`, NOT "0% match".
2. **Verify Instant Layer 1 Rescore**:
   - Upload a sample CV or add skills (e.g., Python, SQL, Git) in `/profile`.
   - Save profile.
   - Notice the matching badge briefly displays "Calculating..." while the debounced `USER_RESCORE` job processes.
   - Refresh or wait for completion: cards display canonical match percentages with color-coded badges (e.g., $\ge 80\%$ emerald, $60\text{--}79\%$ blue, $40\text{--}59\%$ amber).
   - Click the info button next to the match score: the popover opens displaying Layer 1 instant reasoning with specific matching and missing skills.
3. **Verify AI Summary on Strong Matches**:
   - For internships with match $\ge 80\%$, verify that once background reasoning completes, the explanation features a subtle "AI summary" badge.
4. **Verify Consistency on Internship Details**:
   - Click on an internship card to open `/internships/[id]`.
   - Verify the match score and breakdown match the dashboard score exactly.
5. **Verify Employer Side View**:
   - Sign in as an employer and view `/dashboard/employer/internships/[id]`.
   - Verify the applicant cards display the exact same live match score as seen on the student's dashboard.
6. **Verify Posting Changes**:
   - As an employer, edit an internship's required skills.
   - Verify that an `INTERNSHIP_RESCORE` job is enqueued and student match scores update cleanly without deleting rows first.
