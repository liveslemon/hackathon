# Audit Report: Agent 03 — Student Discovery, Applications & Company Profiles

**Branch:** `agent/03-discovery-apply`  
**Area:** Student internship discovery (browsing, filters, search overlay), detail page, AI cover letter generation (streaming & standard), application submission, tracking, withdrawal, offer acceptance, student dashboard home, and public company pages.

---

## 1. Feature Checklist

| Feature / Route / Page | Status | Description |
| :--- | :---: | :--- |
| **Lagos Deadline Engine** (`lib/deadlines.ts`) | 🔧 fixed | Implemented `getDaysUntilDeadline`, `isDeadlinePassed`, and `formatDeadlineCountdown` using `Africa/Lagos` timezone with end-of-day tolerance for date strings (`23:59:59.999 WAT`). |
| **Internship Browsing & Search** (`components/InternshipGrid.tsx`) | 🔧 fixed | Expanded search to cover `category`, `location`, `description`, and `interests`; improved status filtering to inspect both `applicationStatus` and `applicationStage`; safe deadline sorting. |
| **Search Overlay** (`components/SearchOverlay.tsx`) | 🔧 fixed | Added click navigation to `/internships/[id]`, `/companies/[id]`, and `/dashboard/admin/users/[id]`; enabled ArrowUp/Down/Enter keyboard navigation; added Supabase public fallback when `/admin/search` returns 403. |
| **Closed / Expired / Draft Filtering** (`components/InternshipGrid.tsx`, `app/dashboard/student/DashboardParts.tsx`) | 🔧 fixed | Hid draft postings from non-owners/students; filtered closed/expired postings based on Lagos deadline calculation. |
| **Internship Detail Page** (`app/internships/[id]/page.tsx`) | 🔧 fixed | Replaced generic error with Next.js `notFound()`; restricted drafts to owner/admin; queried student CV and profile completeness; displayed `--%` for match score when student has no CV. |
| **Detail Action States & Modal** (`app/internships/[id]/InternshipClientParts.tsx`) | 🔧 fixed | Context-aware buttons: "Upload CV to Apply", "Complete Profile to Apply", "Deadline Passed", "Applied", and "Withdraw Application"; full pipeline stage badge handling. |
| **Cover Letter Streaming Interruption** (`backend/routers/applications.py`, `InternshipClientParts.tsx`) | 🔧 fixed | Handled `asyncio.CancelledError` and `GeneratorExit` cleanly in backend generator; wired `AbortController` in client on modal close and component unmount. |
| **Cover Letter Student Data** (`backend/routers/applications.py`) | 🔧 fixed | Resolved phone number fallback from `profile.get("phone") or profile.get("phone_number") or ""`. |
| **Application Submission API** (`backend/routers/applications.py`, `app/api/applications/route.ts`) | 🔧 fixed | Enforced CV requirement (400), profile completeness (400), closed/expired checks (410); caught Postgres unique constraint `23505` to prevent duplicate submissions (409). |
| **Employer Application Notifications & Email** (`app/api/applications/route.ts`, `backend/routers/applications.py`) | 🔧 fixed | Inserted in-app notification to employer in `notifications` table; triggered transactional notification email via `sendEmail` asynchronously exactly once. |
| **Application Withdrawal API** (`app/api/applications/[id]/withdraw/route.ts`) | 🔧 fixed | Created dedicated endpoint: verifies student ownership, blocks withdrawal on terminal stages (`accepted`, `rejected`, `withdrawn`), updates stage to `withdrawn`, logs stage history, and notifies employer. |
| **Application Progress UI** (`components/ApplicationProgress.tsx`, `components/InternshipCard.tsx`) | 🔧 fixed | Added dedicated `withdrawn` badge in `ApplicationProgress` and card status mapping instead of falling back to generic `applied`. |
| **Offer Acceptance & Placement** (`app/api/applications/[id]/accept/route.ts`) | 🔧 fixed | Verified application ownership and `stage === 'offered'`; handled DB trigger `uniq_one_active_placement_per_student` / `protect_application` returning 409; activated placement (`placement_status = 'active'`, `placed_at = now()`) for logbook initiation. |
| **My Internships / Tracking** (`app/my-internships/MyInternshipsParts.tsx`) | 🔧 fixed | Formatted deadlines using Lagos timezone; wired `applicationId` and pipeline stage down to cards; integrated withdraw actions. |
| **Company Public Page SSR** (`app/companies/[id]/page.tsx`) | 🔧 fixed | SSR query for employer profile with 404 for missing/non-employer users; queried open roles by `employer_id` or `poster_id` filtered in Lagos time. |
| **Company Public Page Client** (`app/companies/[id]/CompanyClient.tsx`) | 🔧 fixed | Consumes server data directly, eliminating failing client-side `/api/companies/[id]` fetch; renders only public fields; provides styled empty state when company has 0 postings. |
| **Student Dashboard Home** (`app/dashboard/student/DashboardParts.tsx`, `CareerMetrics.tsx`) | 🔧 fixed | Hid draft listings from students; queried student profile interests for matching badges; added fallback zeroed metrics to eliminate infinite skeleton pulsing. |
| **Seed Data & Migration** (`public/internships.json`, `seed_internships.sh`, `20261013030000_03_...sql`) | 🔧 fixed | Updated seed deadlines into future; added compound indexes and RLS policy protecting draft postings. |

---

## 2. Bugs Fixed

1. **`backend/routers/applications.py:73-89` (Commit `8e2f3b9`):**
   - *Bug:* `_assert_internship_open` did not exist in backend; students could generate cover letters or apply to closed or deadline-expired internships.
   - *Fix:* Added `is_internship_open` and `_assert_internship_open` utilizing Lagos timezone (`Africa/Lagos`) and full end-of-day date handling; raises HTTP 410 Gone.

2. **`backend/routers/applications.py:108-112` (Commit `8e2f3b9`):**
   - *Bug:* Student phone number in cover letter prompt read only `profile.get("phone")`, which returned empty when the profile stored `phone_number`.
   - *Fix:* Read `profile.get("phone") or profile.get("phone_number") or ""`.

3. **`backend/routers/applications.py:155-175` (Commit `8e2f3b9`):**
   - *Bug:* LLM cover letter streaming crashed with unhandled generator exit or client disconnect errors if the student closed the dialog mid-stream.
   - *Fix:* Wrapped stream consumption in `try ... except (asyncio.CancelledError, GeneratorExit)` and logged graceful disconnect.

4. **`backend/routers/applications.py:180-205` (Commit `8e2f3b9`):**
   - *Bug:* `submit_app` allowed application submission without checking if the student has uploaded a CV, and did not catch PostgreSQL unique constraint violation `23505` on concurrent double-clicks.
   - *Fix:* Added CV check raising 400 Bad Request; caught PostgreSQL unique violation `23505` / `duplicate key` and returned HTTP 409 Conflict; added in-app employer notification insert.

5. **`backend/routers/applications.py:270-295` (Commit `8e2f3b9`):**
   - *Bug:* `_assert_can_manage_internship` only checked `poster_id` and admin role, rejecting legitimate employers where the foreign key was stored in `employer_id`.
   - *Fix:* Checked both `internship.get("employer_id") == user_id` and `internship.get("poster_id") == user_id`.

6. **`frontend/pau-interconnect-app/app/internships/[id]/page.tsx:28-40` (Commit `8e2f3b9`):**
   - *Bug:* Querying a non-existent internship ID rendered a raw generic error text block instead of returning a proper Next.js 404 page.
   - *Fix:* Imported `notFound` from `next/navigation` and invoked `notFound()` when the query returns no row.

7. **`frontend/pau-interconnect-app/app/internships/[id]/page.tsx:120-145` (Commit `8e2f3b9`):**
   - *Bug:* Displayed artificial match score percentage even when the student had never uploaded a CV.
   - *Fix:* Queried `student_cvs` and student profile; if student has no CV, renders `--%` match score with prompt to upload CV.

8. **`frontend/pau-interconnect-app/app/internships/[id]/InternshipClientParts.tsx:90-120` (Commit `8e2f3b9`):**
   - *Bug:* Streamed cover letters had no cancelation hook; closing the modal left background fetch streaming; missing dedicated states for "Upload CV" or "Complete Profile".
   - *Fix:* Added `AbortController` linked to state; canceled stream on modal close and component unmount; replaced raw Apply button with "Upload CV to Apply" or "Complete Profile to Apply" when prerequisites are missing.

9. **`frontend/pau-interconnect-app/app/api/applications/route.ts:50-135` (Commit `8e2f3b9`):**
   - *Bug:* Application submission route did not check CV presence, profile completeness, or open internship status server-side; concurrent double-clicks resulted in raw 500 error; employer notification email was missing.
   - *Fix:* Added server-side validation for CV and profile; checked Lagos deadline/status (410 Gone); caught `23505` returning 409 Conflict; dispatched transactional email to employer via `sendEmail` asynchronously with try/catch fail-open.

10. **`frontend/pau-interconnect-app/app/api/applications/[id]/accept/route.ts:25-70` (Commit `8e2f3b9`):**
    - *Bug:* Accepting an offer did not verify `stage === 'offered'`, and crashed with 500 when database trigger `protect_application` blocked double active placements.
    - *Fix:* Verified user ownership and `stage === 'offered'`; caught active placement exception (`P0001` / `active internship placement`) returning clean 409 Conflict; logged stage history and dispatched in-app notification to employer.

11. **`frontend/pau-interconnect-app/app/companies/[id]/page.tsx:1-60` (Commit `658bed0`):**
    - *Bug:* Page was an empty client component shell attempting to fetch `/api/companies/[id]` which does not exist in Next.js routes, resulting in 404/blank page.
    - *Fix:* Migrated page to Next.js Server Component; queried employer profile from `profiles` table (returning 404 for missing/non-employer users); queried published roles matching `employer_id` or `poster_id` filtered in Lagos time; passed pre-rendered data to client.

12. **`frontend/pau-interconnect-app/app/companies/[id]/CompanyClient.tsx:1-90` (Commit `658bed0`):**
    - *Bug:* Client component exposed raw state without handling empty postings or loading transitions.
    - *Fix:* Sanitized rendered fields to public metadata only (company name, industry, website, bio, location, logo); added clean empty state card when company has zero open postings.

13. **`frontend/pau-interconnect-app/components/SearchOverlay.tsx:50-95` (Commit `72e6245`):**
    - *Bug:* Search overlay items were not clickable to navigate to their targets; non-admin users received 403 from `/admin/search` and saw an error with zero results.
    - *Fix:* Added click navigation to `/internships/[id]`, `/companies/[id]`, and `/dashboard/admin/users/[id]`; enabled keyboard navigation (ArrowUp, ArrowDown, Enter); added client-side Supabase public internship search fallback when `/admin/search` returns 403.

14. **`frontend/pau-interconnect-app/app/dashboard/student/CareerMetrics.tsx:20-45` (Commit `72e6245`):**
    - *Bug:* When user has no applications or on network failure, component remained in infinite pulsing skeleton state.
    - *Fix:* Provided zeroed metrics fallback state on empty data or error to ensure dashboard renders cleanly.

---

## 3. Tests Added & Verification Results

### Frontend Unit & Integration Tests (Vitest)
- File: `frontend/pau-interconnect-app/tests/lib/deadlines.test.ts`
- Tests added:
  1. `getDaysUntilDeadline returns null for null or invalid dates`
  2. `calculates days correctly for ISO timestamp strings`
  3. `treats date-only strings as open through end of day in Lagos (23:59:59.999 WAT)`
  4. `identifies expired dates correctly`
  5. `formats countdown as 'Ends today' when 0 days remaining`
  6. `formats countdown as 'X days left' or 'Deadline passed'`

**Execution Command:**
```bash
cd frontend/pau-interconnect-app && npm run test
```
**Result:**
```
✓ tests/lib/placements.test.ts (1 test)
✓ tests/lib/logbook-dates.test.ts (5 tests)
✓ tests/lib/api-error.test.ts (2 tests)
✓ tests/lib/deadlines.test.ts (6 tests)
✓ tests/lib/email.test.ts (4 tests)
✓ tests/lib/env.test.ts (1 test)
✓ tests/lib/post-login.test.ts (4 tests)

Test Files  7 passed (7)
     Tests  23 passed (23)
```

**Typecheck & Lint Execution Commands:**
```bash
cd frontend/pau-interconnect-app && npm run typecheck
cd frontend/pau-interconnect-app && npm run lint
```
**Results:**
- `npm run typecheck`: 0 errors.
- `npm run lint`: 0 errors (55 warnings, all pre-existing in other agent territories).

---

### Backend Unit & Integration Tests (Pytest)
- Directory: `backend/tests/discovery_apply/`
- Files:
  - `backend/tests/discovery_apply/conftest.py`: Mock test client environment with Supabase service keys.
  - `backend/tests/discovery_apply/test_applications.py`: Test suite with 13 mocked tests.
- Tests added:
  1. `test_is_internship_open_with_future_date`: Confirms open for future date string.
  2. `test_is_internship_open_with_past_date`: Confirms closed for past date string.
  3. `test_is_internship_open_with_closed_status`: Confirms closed when `status != 'open'`.
  4. `test_draft_cover_letter_closed_internship_returns_410`: Verifies HTTP 410 on closed internship.
  5. `test_draft_cover_letter_missing_cv_returns_400`: Verifies HTTP 400 when student lacks CV.
  6. `test_draft_cover_letter_success`: Verifies cover letter draft generation with real student phone fallback.
  7. `test_draft_cover_letter_stream_cancelled`: Verifies stream handles cancellation without crashing.
  8. `test_submit_application_closed_internship_returns_410`: Verifies HTTP 410 on submission to closed internship.
  9. `test_submit_application_missing_cv_returns_400`: Verifies HTTP 400 when submitting without CV.
  10. `test_submit_application_duplicate_returns_409`: Verifies HTTP 409 conflict on Postgres 23505 unique error.
  11. `test_submit_application_success`: Verifies successful application submission and notification creation.
  12. `test_get_student_applications`: Verifies student application tracking returns list with stage.
  13. `test_update_application_status_employer_check`: Verifies employer permissions on `employer_id` and `poster_id`.

**Execution Command:**
```bash
cd backend && source .venv/bin/activate && pytest tests/discovery_apply/
```
**Result:**
```
============================= test session starts ==============================
rootdir: /Users/macbook/Documents/Uni stuff/PAU/Tech innovation club/pau-03-discovery-apply/backend
plugins: anyio-4.15.1
collected 13 items

tests/discovery_apply/test_applications.py .............                 [100%]

======================== 13 passed, 3 warnings in 0.18s ========================
```

---

## 4. New Migrations

File created: `frontend/pau-interconnect-app/supabase/migrations/20261013030000_03_discovery_apply_optimizations.sql`

**Contents & Capabilities:**
1. **Compound Indexes:**
   - `idx_internships_status_deadline`: Speeds up discovery queries filtering by `status = 'open'` and sorting by `deadline ASC`.
   - `idx_applied_internships_student_stage`: Optimizes student tracking queries in `/my-internships` and `/dashboard/student`.
   - `idx_applied_internships_unique_active`: Enforces partial index ensuring unique active placement per student.
2. **Idempotent RLS Policy:**
   - `internships_student_select_published`: Restricts select access for anonymous users and students so that `status = 'draft'` postings are strictly hidden unless viewed by the employer who authored them or an admin.

---

## 5. Handoffs

1. **Agent 06 (Employer Management):**
   - **File:** `backend/routers/applications.py` (endpoints `/internships/{id}/applicants` and `/applications/{id}/status`).
   - **Notes:** We verified and hardened `_assert_can_manage_internship` to allow either `employer_id` or `poster_id`. When students withdraw their application via `/api/applications/[id]/withdraw`, the stage is updated to `withdrawn` and an in-app notification is sent to the employer. Please ensure your applicant pipeline UI reflects the `withdrawn` stage chip properly.
2. **Agent 05 (Logbook & Placements):**
   - **File:** `frontend/pau-interconnect-app/app/api/applications/[id]/accept/route.ts` and `lib/placements.ts`.
   - **Notes:** Accepting an offer directly initializes the active placement (`placement_status = 'active'`, `placed_at = now()`, `stage = 'accepted'`). If a student attempts to accept a second offer while an active placement exists, the database trigger raises a constraint error which our endpoint cleanly translates to HTTP 409 Conflict with a clear user message.
3. **Agent 08 (Platform / DB) & Repo Maintainers:**
   - **File:** `frontend/pau-interconnect-app/eslint.config.mjs`.
   - **Change:** Added `"supabase/functions/**"` to the `globalIgnores` block (1 line) because Deno Edge Functions in the Supabase directory use Deno-specific headers (`@ts-nocheck` with triple-slash lib references) which caused ESLint parsing failures during `npm run lint`.

---

## 6. Manual Test Steps in the Browser

1. **Discover & Filter Internships:**
   - Navigate to `/internships`.
   - Verify that search filters respond instantly to role title, category, location, and matching tags.
   - Verify that all visible listings show active deadlines (e.g. "X days left" or "Ends today") calculated in Nigerian time (`WAT`).
   - Confirm that draft listings are hidden from students.
2. **Search Overlay:**
   - Press `Cmd+K` (or `Ctrl+K`) on any page.
   - Type a query matching an internship or company name.
   - Use the `Up` and `Down` arrow keys to highlight items, and press `Enter` to navigate directly.
3. **Internship Detail Page & Apply Flow:**
   - Navigate to `/internships/<id>` as an authenticated student.
   - If profile or CV is incomplete, verify that the action button indicates "Upload CV to Apply" or "Complete Profile to Apply".
   - Once CV is uploaded, click **Apply Now**.
   - Click **Generate with AI** in the modal. Verify that streaming tokens appear in real time.
   - Close the modal mid-stream: verify that streaming cleanly halts without browser console exceptions.
   - Open modal again, edit the cover letter draft text, and click **Submit Application**.
   - Confirm that the button updates to **Applied**, match score is visible, and employer receives notification.
   - Attempt to click Submit twice rapidly: verify only one application is created with no duplicate error alerts.
4. **Application Tracking & Withdrawal:**
   - Navigate to `/my-internships`.
   - Confirm that the submitted application displays with stage `Applied`.
   - Click the application to view details or click **Withdraw Application**.
   - Confirm confirmation dialog; upon confirming, verify the stage badge updates to `Withdrawn`.
5. **Accept Offer & Single Placement Enforcement:**
   - For an application updated by an employer to stage `Offered`, navigate to `/my-internships`.
   - Click **Accept Offer**.
   - Verify that the placement is marked `active` and links to the logbook.
   - If an offer for a second internship is accepted, confirm that a 409 alert indicates an active placement is already in progress.
6. **Company Public Page:**
   - Navigate to `/companies/<id>` for any valid employer.
   - Verify company name, bio, industry, location, and open postings list correctly.
   - For an employer with zero active roles, verify that the page renders a clean empty state card instead of breaking.
   - Navigate to `/companies/non-existent-id` and verify that a 404 page is rendered.
