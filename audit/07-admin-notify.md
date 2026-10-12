# Audit Report — Agent 07 (Admin Portal & Notification System)

**Branch**: `agent/07-admin-notify`  
**Area**: Admin portal, analytics, directory, search, in-app notifications, transactional email, and scheduled reminders.

---

## 1. Feature Checklist

| Feature / Route / Page | Status | Description |
|---|:---:|---|
| `GET /admin/stats` & `GET /api/admin/stats` | 🔧 fixed | Added `total_employers` count, accurate `applications_today` and `new_users_today`, efficient exact counting without table scans, and optional date-range filtering. |
| `GET /admin/analytics` & `GET /api/admin/analytics` | 🔧 fixed | Eliminated full-table loads of `applied_internships`, added `avg_applications`, and added `category` + `deadline` to top internship statistics for complete UI rendering. |
| `GET /admin/directory` & `GET /api/admin/directory` | 🔧 fixed | Added safe pagination (`data` + `pagination`), role filtering, and sanitized name/email search without filter injection. |
| `GET /admin/search` & `GET /api/admin/search` | 🔧 fixed | Sanitized search queries against PostgREST operator injection, and keyed outputs (`students`, `employers`, `internships`) to align with `SearchOverlay.tsx`. |
| `GET /admin/llm-health` & `GET /api/admin/llm-health` | 🔧 fixed | Ensured both endpoint paths exist, strictly protected by `verify_admin`, with graceful fallback for provider availability. |
| `POST /admin/users/{id}/suspend` & `reinstate` | 🔧 fixed | Safe user account suspension with self-targeting and admin-targeting prevention, fully audited in `decision_audit_log`. |
| `POST /admin/employers/{id}/verify` & `unverify` | 🔧 fixed | Employer verification toggles, recorded in `profiles.is_verified` and audited in `decision_audit_log`. |
| `POST /admin/internships/{id}/status` | 🔧 fixed | Moderation of internship listings (active/closed) with audit trail. |
| `/admin` (`app/admin/page.tsx`) | 🔧 fixed | Replaced client-side hardcoded mock passwords with Supabase Auth sign-in and server-aligned admin verification. |
| `/dashboard/admin` (`app/dashboard/admin/page.tsx`) | 🔧 fixed | Validated server-side admin role check via `getUserRoleProfile` and email whitelist, passing `userId` down to client components. |
| `AdminClient` (`app/dashboard/admin/AdminClient.tsx`) | 🔧 fixed | Integrated real-time `NotificationBell` alongside search overlay and logout controls. |
| `OverviewView` (`app/dashboard/admin/overview/OverviewView.tsx`) | ✅ verified | Displays all 6 platform metrics (students, employers, internships, applications, today's apps, new users) reliably. |
| `AnalyticsView` & `AnalyticsCharts` | 🔧 fixed | Rendered real categories, deadlines, and average application counts without table truncation. |
| `ManagePlatformView` (`app/dashboard/admin/manage/ManagePlatformView.tsx`) | 🔧 fixed | Resolved crash where API pagination object was treated as a raw array; added employer verification and user suspension buttons with safety guards. |
| `PostInternshipView` (`app/dashboard/admin/post/PostInternshipView.tsx`) | 🔧 fixed | Corrected `poster_id` selection to prefer currently authenticated admin session rather than picking an arbitrary database admin profile, with explicit `status: "active"`. |
| `NotificationBell` (`components/NotificationBell.tsx`) | 🔧 fixed | Scoped realtime channels to user ID (`user-notifications-${userId}`), accurately fetched exact unread counts, and added accessible controls with outside-click dismissal. |
| `notifications.ts` (`lib/notifications.ts`) | 🔧 fixed | Implemented multi-key opt-out mapping against both modern `settings.notifications` and legacy `notification_preferences`, with input validation and unread count helpers. |
| `email.ts` (`lib/email.ts`) | 🔧 fixed | Hardened against empty recipients and network failures, added `sendNotificationEmailWithOptOut` helper, and supported Brevo with Resend fallback. |
| `email-templates.ts` (`lib/email-templates.ts`) | 🔧 fixed | Added HTML escaping for all user variables (preventing markup injection), enforced absolute URLs, provided direct unsubscribe/settings links, and added `deadlineReminderEmail`. |
| `deadline-reminders` (`supabase/functions/deadline-reminders/index.ts`) | 🔧 fixed | Fixed ESLint `@ts-nocheck` error, added authorization guards (`CRON_SECRET` / Service Role), aligned with Africa/Lagos WAT timezone, and enforced daily idempotency. |
| DB Trigger: `notify_employer_on_application` | 🔧 fixed | Coalesced `employer_id` with `poster_id`, checked both modern and legacy notification opt-outs, and prevented duplicate triggers. |

---

## 2. Bugs Fixed

1. **Hardcoded Mock Credentials & Auth Bypass in `/admin`**
   - **File**: `frontend/pau-interconnect-app/app/admin/page.tsx:19-52`
   - **Commit**: `8a28163`
   - **Fix**: Removed hardcoded `adminAccounts` array containing plain text passwords (`admin123`, `super456`, `admin789`). Replaced with authentic Supabase Auth authentication (`signInWithPassword`) and strict server-aligned administrator check (`is_admin` or email whitelist).

2. **Search Results Mismatch Breaking Super Search Overlay**
   - **File**: `backend/routers/admin.py:179-201`
   - **Commit**: `6f609ab`
   - **Fix**: `/admin/search` previously returned an object with only a `data` list, whereas `SearchOverlay.tsx` expected keys `{ students, employers, internships }`. Updated endpoint to return both categorised keys and the unified list.

3. **PostgREST Query / Filter Injection via Search & Directory Queries**
   - **File**: `backend/routers/admin.py:150-170`
   - **Commit**: `6f609ab`
   - **Fix**: Special characters (`.`, `:`, `,`, `(`, `)`, `"`) injected into PostgREST `.or_()` filters allowed condition splitting and filter tampering. Added `sanitize_search_query()` to strip delimiter characters and sanitize wildcards before query generation.

4. **Missing `total_employers`, `applications_today`, and `new_users_today` in Admin Stats**
   - **File**: `backend/routers/admin.py:21-38`
   - **Commit**: `6f609ab`
   - **Fix**: Endpoint omitted `total_employers` (causing the Overview UI card to display 0) and hardcoded `applications_today` and `new_users_today` to 0. Implemented exact counting queries for all platform metrics.

5. **Full Table Loads in Analytics**
   - **File**: `backend/routers/admin.py:55-88`
   - **Commit**: `6f609ab`
   - **Fix**: Endpoint fetched the entire `applied_internships` table into server memory on every analytics request. Replaced with exact count queries and scoped internship-specific lookups.

6. **Directory API Shape TypeError Crashing `ManagePlatformView`**
   - **File**: `frontend/pau-interconnect-app/app/dashboard/admin/manage/ManagePlatformView.tsx:38-59`
   - **Commit**: `8a28163`
   - **Fix**: Endpoint returned `{ data: [...], pagination: {...} }`, but UI treated the response as a raw array and called `profiles.filter()`, causing a fatal runtime exception. Added defensive unwrapping supporting both response structures.

7. **Poster ID Misattribution in Admin Internship Posting**
   - **File**: `frontend/pau-interconnect-app/app/dashboard/admin/post/PostInternshipView.tsx:87-94`
   - **Commit**: `8a28163`
   - **Fix**: Posting logic previously queried an arbitrary administrator record (`profiles.select('id').eq('is_admin', true).maybeSingle()`) instead of prioritizing the currently authenticated admin session. Updated to use `user?.id ?? adminProfile?.id`.

8. **Missing HTML Escaping in Email Templates**
   - **File**: `frontend/pau-interconnect-app/lib/email-templates.ts:9-85`
   - **Commit**: `2e64a8f`
   - **Fix**: User-provided inputs (`studentName`, `employerName`, `role`, `company`, `feedback`, `date`) were directly interpolated into HTML emails without escaping. Implemented `escapeHtml()` across all templates.

9. **Unauthenticated & Non-Idempotent Deadline Reminders Edge Function**
   - **File**: `frontend/pau-interconnect-app/supabase/functions/deadline-reminders/index.ts:1-66`
   - **Commit**: `2e64a8f`
   - **Fix**: The function lacked authorization checks, had no idempotency controls (sending duplicate emails on retries), relied on an invalid `@ts-nocheck` annotation, and only supported Resend. Added auth headers verification, Lagos (WAT) timezone calculations, daily idempotency tracking, and Brevo/Resend support.

10. **Global Shared Realtime Channel in NotificationBell**
    - **File**: `frontend/pau-interconnect-app/components/NotificationBell.tsx:53-78`
    - **Commit**: `69e9fc8`
    - **Fix**: Realtime subscription listened on a static global channel `"notifications"` across all sessions. Scoped channels to `user-notifications-${userId}`, updated unread badge tracking, and added accessible interaction states.

---

## 3. Tests Added & Execution Results

### Frontend Tests (Vitest)
Ran:
```bash
cd frontend/pau-interconnect-app && npm run test
```
**Result**: 7 passed test files, 32 passed unit tests (0 failures).
- `tests/lib/email.test.ts` (12 tests):
  - Skips when recipient is empty or missing.
  - Skips when no provider is configured.
  - Successfully sends via Brevo with verified sender.
  - Surfaces Brevo error payloads without throwing or crashing requests.
  - Falls back to Resend when only `RESEND_API_KEY` is present.
  - `escapeHtml` accurately strips `<script>`, quotes, ampersands, and tags.
  - `applicationStatusEmail` escapes malicious payloads in student names, roles, and feedback.
  - `applicationReceivedEmail` escapes employer and student metadata.
  - `logbookFlaggedEmail` escapes student name, date, and feedback.
  - `deadlineReminderEmail` escapes role and employer name.
  - Email templates produce absolute URLs and include direct links to user settings.
  - `sendNotificationEmailWithOptOut` skips sending when recipient opted out in settings.
- `tests/lib/notifications.test.ts` (7 tests):
  - Validates missing required input parameters.
  - Skips delivery when user opted out in modern `settings.notifications`.
  - Skips delivery when user opted out in legacy `notification_preferences`.
  - Inserts notification record when opted in.
  - Marks individual notification as read.
  - Marks all notifications as read for a user.
  - Fetches exact unread count.

### Frontend Quality Checks
- `npm run typecheck`: Passed with 0 errors (`tsc --noEmit`).
- `npm run lint`: Passed with 0 errors across the repository.
- `npm run build`: Production Turbopack build succeeded in 26.4s (37/37 static and dynamic pages generated).

### Backend Tests (pytest)
Ran:
```bash
cd backend && .venv/bin/pytest tests/admin/ -vv
```
**Result**: 18 passed tests in 0.22s (0 failures).
- `test_sanitize_search_query_strips_injection_characters`: Verifies removal of commas, colons, quotes, dots, parentheses, and wildcards.
- `test_sanitize_search_query_preserves_legitimate_terms`: Verifies normal search terms with spaces and hyphens are preserved.
- `test_admin_stats_unauthenticated`: Returns 401/403 for unauthenticated stats requests.
- `test_admin_analytics_unauthenticated`: Returns 401/403 for unauthenticated analytics requests.
- `test_admin_directory_unauthenticated`: Returns 401/403 for unauthenticated directory requests.
- `test_admin_search_unauthenticated`: Returns 401/403 for unauthenticated search requests.
- `test_admin_llm_health_unauthenticated`: Returns 401/403 for unauthenticated LLM health requests.
- `test_admin_endpoints_reject_non_admin`: Rejects student and non-admin tokens with 403 Forbidden.
- `test_admin_stats_success`: Returns counts for students, employers, internships, applications, and today's additions.
- `test_admin_analytics_success`: Returns total counts, average applications, and detailed stats with category and deadline.
- `test_admin_search_returns_aligned_shape`: Returns keyed lists `{ students, employers, internships, data }`.
- `test_admin_search_empty_symbols_skips_query`: Returns empty results without database execution when only symbols are submitted.
- `test_admin_directory_pagination`: Verifies pagination calculation and user listing.
- `test_suspend_user_cannot_target_admin`: Blocks attempts to suspend administrator accounts with 403 Forbidden.
- `test_suspend_user_cannot_target_self`: Blocks admin self-suspension with 400 Bad Request.
- `test_suspend_regular_user_success_and_audited`: Suspends regular user and writes entry to `decision_audit_log`.
- `test_verify_employer_success_and_audited`: Marks employer verified and writes entry to `decision_audit_log`.
- `test_llm_health_admin_only`: Executes provider health check for authenticated administrators.

---

## 4. New Migrations

### `20261013070000_07_admin_platform_management.sql`
- **Columns Added**:
  - `profiles.is_suspended` (BOOLEAN, default `FALSE`)
  - `profiles.suspended_at` (TIMESTAMPTZ)
  - `profiles.suspended_by` (UUID REFERENCES `profiles(id)`)
  - `profiles.suspension_reason` (TEXT)
  - `profiles.is_verified` (BOOLEAN, default `FALSE`)
  - `profiles.verified_at` (TIMESTAMPTZ)
  - `profiles.verified_by` (UUID REFERENCES `profiles(id)`)
  - `internships.last_reminder_sent_at` (TIMESTAMPTZ) for deadline reminder idempotency.
- **Tables Created**:
  - `decision_audit_log` with indexes on `(actor_id, created_at DESC)` and `(target_type, target_id)`.
- **Triggers Updated**:
  - Replaced `notify_employer_on_application()` trigger on `applied_internships` to coalesce `employer_id` with `poster_id` and check employer notification opt-out settings in `profiles.settings` and `profiles.notification_preferences` before inserting.

---

## 5. Handoffs

1. **Agent 06 (Employer Area)**:
   - **Files**: `app/dashboard/employer/post/page.tsx` and `app/dashboard/admin/post/PostInternshipView.tsx`
   - **Request**: Currently, admin internship posting (`PostInternshipView.tsx`) and employer internship posting duplicate form logic, field definitions, and category lists. Recommend consolidating the internship creation form into a shared component (`components/internships/InternshipForm.tsx`) that accepts an optional `targetPosterId` or `isAdmin` prop.
2. **Agent 04 (Profile & Settings)**:
   - **Files**: `app/dashboard/employer/settings/SettingsClient.tsx`
   - **Request**: Ensure employer settings UI exposes explicit checkboxes for `email_deadline_reminder` and `new_application` notifications under `profiles.settings.notifications`, matching the keys audited by `deadline-reminders` and `notify_employer_on_application`.

---

## 6. Manual Test Steps (Browser Verification)

1. **Admin Portal Authentication**:
   - Navigate to `/admin`.
   - Verify the login form renders with email and security key fields.
   - Enter invalid credentials; verify error alert appears.
   - Enter an authorized administrator email (e.g. `hillary.ilona@pau.edu.ng`); verify redirect to `/dashboard/admin`.
   - Attempt to log in with a non-admin student account; verify session is revoked and error "Unauthorized: This account does not have administrator privileges" displays.

2. **Admin Overview & Analytics**:
   - Navigate to `/dashboard/admin?tab=overview`.
   - Confirm that all 6 metric cards display numbers without crashing (Total Students, Total Employers, Internships Posted, Total Applications, Applications Today, New Users Today).
   - Switch to the "Analytics" tab (`?tab=analytics`).
   - Confirm Application Volume chart displays top 10 roles.
   - Verify Detailed Application Overview table displays actual company names, roles, categories, and formatted deadlines.

3. **Super Search**:
   - Click "Super search..." in the admin header or press the search shortcut.
   - Type 2 or more characters (e.g. "tech" or "CS").
   - Confirm search overlay populates separated sections for Students, Employers, and Internships.
   - Type special characters (`%`, `,`, `:`, `.`) and confirm search does not crash or return a 400 Bad Request error.

4. **Platform Directory & Management**:
   - Switch to the "Manage Platform" tab (`?tab=manage`).
   - Confirm that both Registered Companies and Registered Students tables load without errors.
   - Click "Verify Employer" on an unverified employer; confirm verification badge toggles to "Verified" and success toast displays.
   - Click "Suspend" on a student account; confirm status badge changes to "Suspended" and reinstatement button appears.
   - Note that administrator rows show "Protected" and do not permit suspension.

5. **Notification Bell**:
   - In the admin header, verify the bell icon displays next to Logout.
   - Click the bell icon; confirm the notification panel opens, displaying recent alerts and unread count.
   - Click outside the dropdown to verify it closes smoothly.
   - Click "Mark all read"; verify unread badge updates to 0.
