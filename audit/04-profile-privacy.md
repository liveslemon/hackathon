# Audit Report — Agent 04: Profile, Privacy, Employer Company & Settings

- **Branch**: `agent/04-profile-privacy`
- **Ownership Area**: Student profile (own and public view), employer company profile and settings, privacy and notification preferences, data export, and account deletion.

---

## 1. Feature Checklist

| Feature / Route / Page | Status | Details |
|---|---|---|
| `app/profile/page.tsx` | 🔧 fixed | Student profile settings page; redirects employers to `/dashboard/employer/settings` and admins to `/dashboard/admin`. |
| `app/profile/ProfileClient.tsx` | 🔧 fixed | Validates every field (name, phone, CGPA, graduation, bio, experience, projects, certs, languages, links), prevents lost edits, updates cleaned local state, and triggers background re-matching. |
| `app/profile/[id]/page.tsx` | 🔧 fixed | Enforces student profile read scoping (`scope_profile_reads`); permits owner, admins, and authorized employers (who received applications or supervise logbooks); applies server-side privacy masking. |
| `app/profile/[id]/StudentPublicProfile.tsx` | ✅ verified | Displays student public view; properly respects masked phone/email values and renders CV viewer for authorized viewers. |
| `app/dashboard/student/settings/StudentSettingsClient.tsx` | 🔧 fixed | Manages password changes, notification opt-outs, phone/email visibility, unsaved changes tracking, and self-service account deletion. |
| `app/dashboard/employer/settings/SettingsClient.tsx` | 🔧 fixed | Atomic save with storage rollback on failure; validates with Zod; supports company name, logo/banner uploads, and notification preferences (`email_new_applicant`, `email_logbook_submitted`, `email_deadline_reminder`). |
| `app/api/me/export/route.ts` | 🔧 fixed | Comprehensive "Download My Data" endpoint: includes profile, CV link, CV version history, applications, logbook, conversations, sent messages, matches, and notifications; sets RFC-compliant attachment filename and UTF-8 JSON headers. |
| `lib/privacy.ts` | 🔧 fixed | Parses privacy settings from object or JSON string; hides `PRIVATE_COLUMNS` (now including `cv_structured`); sets phone/email to null when visibility is `only_me`. |
| `lib/validations/employer.ts` | 🔧 fixed | Zod schemas for employer settings, postings, and notification preferences; validates URLs without protocol issues and checks minimum description lengths. |
| `backend/routers/profiles.py: PATCH /api/employer/profile` | 🔧 fixed | Validates company profile with Pydantic; checks employer role; validates web URLs for website, logo, banner; updates and returns updated profile data. |
| `backend/routers/profiles.py: GET /api/companies/{employer_id}` | 🔧 fixed | Validates UUID format; queries internships matching either `poster_id` OR `employer_id`; returns company name, description, branding, and postings. |
| `backend/routers/profiles.py: POST /api/me/delete` | 🔧 fixed | Requires `confirm: "DELETE"`; restricts to student role; cleans up all storage objects across CV versions; cascades deletion across all foreign key tables; revokes auth user. |
| `backend/routers/profiles.py: POST /api/me/refresh-matches` | ✅ verified | Authenticates caller, enforces 10/hour rate limit, and enqueues `PROFILE_REMATCH` job in durable queue. |
| Migration `20261011000400_sync_profile_email.sql` | ✅ verified | Verified trigger `trg_sync_profile_email` on `auth.users` keeps `profiles.email` in sync when user email changes. |

---

## 2. Bugs Fixed

1. **`ProfileClient.tsx`: Missing Field Validations & Lost Edits on Save/Cancel**
   - **File & Line**: `frontend/pau-interconnect-app/app/profile/ProfileClient.tsx:180-280, 510-600`
   - **Commit**: `47d11f9`
   - **Fix**: Added validation for full name, phone number, CGPA range (0-5), graduation year range (2020-2040), bio length (max 300), experience entries, projects, certifications, languages, and portfolio URLs. Added `hasUnsavedChanges` guard with `beforeunload` warning. Synchronized cleaned entries back into state upon saving to prevent ghost rows.

2. **`app/profile/[id]/page.tsx`: Incomplete Access Control for Employers & Unmasked Student Data**
   - **File & Line**: `frontend/pau-interconnect-app/app/profile/[id]/page.tsx:30-74`
   - **Commit**: `47d11f9`
   - **Fix**: Implemented application-level access control defense-in-depth verifying whether viewing employer has received applications or supervises student logbook entries. Enforced server-side masking (`maskStudentForEmployer`) hiding private columns (`cv_structured`, `cv_text`, `cv_embedding`, `cv_analysis`, etc.) and nullifying phone/email when visibility is `only_me`.

3. **`backend/routers/profiles.py`: `GET /api/companies/{employer_id}` Omitted `employer_id` Postings and Company Name**
   - **File & Line**: `backend/routers/profiles.py:72-92`
   - **Commit**: `8751c79`
   - **Fix**: The query previously only searched `eq("poster_id", employer_id)`, ignoring postings created with `employer_id`. Updated query to match either `poster_id` or `employer_id`. Added `company_name` and `notification_preferences` to selected profile fields.

4. **`backend/routers/profiles.py`: Incomplete Account Deletion Storage and Relation Cleanup**
   - **File & Line**: `backend/routers/profiles.py:108-175`
   - **Commit**: `8751c79`
   - **Fix**: CV deletion previously only checked `profiles.cv_url`. Now queries `cv_versions` to delete all historical CV files from the `cvs` storage bucket. Added deletion/cleanup for `application_stage_history` (both by `changed_by` and `application_id`), `company_followers`, `audit_log`, `decision_audit_log`, `cv_versions`, and direct messages.

5. **`SettingsClient.tsx`: Non-Atomic Save Orphaned Storage Assets on Save Failures**
   - **File & Line**: `frontend/pau-interconnect-app/app/dashboard/employer/settings/SettingsClient.tsx:135-215`
   - **Commit**: `8751c79`
   - **Fix**: Added automatic rollback removing newly uploaded logo/banner files from `company_assets` bucket if the backend metadata PATCH request fails. Pre-validates form data client-side with `companySettingsSchema` before attempting storage upload. Added employer notification preferences and unsaved changes tracking.

6. **`app/api/me/export/route.ts`: Data Export Missing Messages, Conversations, and CV History**
   - **File & Line**: `frontend/pau-interconnect-app/app/api/me/export/route.ts:16-105`
   - **Commit**: `d64c606`
   - **Fix**: Export now includes conversations, sent messages, CV history, explicit `cv_link`, and role-based records (student applications vs employer postings/reviews). Formatted Content-Disposition header with user ID and date.

7. **`eslint.config.mjs`: Build-Breaking ESLint Error on Supabase Deno Edge Functions**
   - **File & Line**: `frontend/pau-interconnect-app/eslint.config.mjs:26`
   - **Commit**: `d64c606`
   - **Fix**: Added `"supabase/functions/**"` to ESLint `globalIgnores` so Deno edge function `@ts-nocheck` comments are not evaluated by Next.js ESLint.

---

## 3. Tests Added

### Frontend Tests (Vitest)
1. `tests/lib/privacy.test.ts` (12 tests)
   - `readPrivacy`: tests null/undefined settings, JSON stringified input, malformed JSON fallback, legacy format fallback, and unknown value fallbacks.
   - `maskStudentForEmployer`: verifies removal of all `PRIVATE_COLUMNS`, preservation of employer-visible contact info, nullification of phone when `only_me`, nullification of email when `only_me`, and graceful handling of empty inputs.
2. `tests/lib/employer-validation.test.ts` (12 tests)
   - `companySettingsSchema`: valid payload, empty optional fields, protocol-less URL normalization, URL validation without spaces, minimum character limits on description and culture, and company name validation.
   - `postInternshipSchema`: valid posting, minimum role length, minimum description length, invalid category rejection.
   - `employerNotificationPrefsSchema`: default boolean values.

### Backend Tests (pytest)
1. `backend/tests/profiles/test_profiles.py` (11 tests)
   - `test_update_company_profile_success`
   - `test_update_company_profile_forbidden_for_student`
   - `test_update_company_profile_invalid_url`
   - `test_update_company_profile_empty_payload`
   - `test_get_company_profile_success`
   - `test_get_company_profile_not_found`
   - `test_get_company_profile_invalid_uuid`
   - `test_delete_account_success`
   - `test_delete_account_missing_confirm`
   - `test_delete_account_employer_forbidden`
   - `test_refresh_matches_enqueues_job`

### Commands Run & Output
```bash
# Frontend Tests & Quality Checks
cd frontend/pau-interconnect-app && npm run lint && npm run typecheck && npm run test
# Result:
# eslint: 0 errors
# tsc --noEmit: 0 errors
# vitest run: 8 test files passed (41/41 tests passed)

# Frontend Production Build Check
cd frontend/pau-interconnect-app && NEXT_PUBLIC_SUPABASE_URL=https://mock.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=mock npm run build
# Result:
# 37/37 static and dynamic routes compiled successfully in 15.4s

# Backend Tests
cd backend && source .venv/bin/activate && PYTHONPATH=. pytest tests/profiles/
# Result:
# 11 passed, 1 warning in 0.08s
```

---

## 4. New Migrations

- **File**: `frontend/pau-interconnect-app/supabase/migrations/20261013040000_04_profile_privacy_and_security.sql`
- **What it does**:
  1. Ensures all employer profile columns exist (`company_name`, `company_website`, `company_logo_url`, `company_banner_url`, `company_description`, `industry`, `culture`, `notification_preferences`, `settings`).
  2. Ensures `sync_profile_email` and `fill_profile_email` triggers are idempotently installed on `auth.users` and `public.profiles`.
  3. Deploys `is_platform_admin()` and `employer_can_view_student(uuid)` functions with explicit execution grants.
  4. Deploys idempotent `profiles_read_scoped` RLS policy on `public.profiles`.
  5. Configures `company_assets` storage bucket and row-level policies for public reading and authenticated uploads.

---

## 5. Handoffs

1. **File**: `frontend/pau-interconnect-app/lib/notifications.ts` (Agent 07)
   - **Status**: Checked and verified.
   - **Notes**: `createNotification()` already reads `profiles.settings.notifications[OPT_OUT_KEY[input.type]]` and respects user opt-outs for messages.
2. **File**: `frontend/pau-interconnect-app/eslint.config.mjs`
   - **Change**: Added `"supabase/functions/**"` to `globalIgnores` (1 line).
   - **Reason**: Unavoidable build check fix so Deno edge function `@ts-nocheck` does not break `npm run lint`.

---

## 6. Manual Test Steps for Browser Verification

1. **Student Profile Editing**:
   - Log in as student at `/login/student`.
   - Go to `/profile`.
   - Click "Edit Profile", change bio, add a project with GitHub and demo links, and add an experience entry.
   - Click "Back to Dashboard" without saving — observe browser prompt warning about unsaved changes.
   - Click "Save Changes" — verify green success message and background match refresh indicator.
2. **Public Student Profile Access Control & Privacy Masking**:
   - In Settings (`/dashboard/student/settings`), set "Phone Number" and "Email Address" visibility to "Only me".
   - Open `/profile/[student-id]` while signed in as that student — observe full email and phone are displayed.
   - Log in as an employer who has **not** received an application from this student and visit `/profile/[student-id]` — observe 404 (Not Found).
   - Log in as an employer whose job posting the student applied for and visit `/profile/[student-id]` — observe profile renders, but phone and email are hidden/omitted.
3. **Employer Company Settings & Atomic Save**:
   - Log in as employer at `/login/employer`.
   - Go to `/dashboard/employer/settings`.
   - Update company name, website, industry, description, culture, and toggle email notification preferences.
   - Select a company logo (under 2MB) and company banner image.
   - Click "Save Changes" — observe upload, atomic save, and "Company profile updated successfully!" message.
   - Click "View Public Profile" (`/companies/[employer-id]`) — observe all updated information, branding images, and posted roles displayed accurately.
4. **Data Export**:
   - Navigate to `/api/me/export` in the browser or click "Download my data" in student settings.
   - Verify browser prompts to download `pau-interconnect-data-[user-id]-[date].json`.
   - Open downloaded JSON and verify it contains account details, profile, applications, logbook entries, and messages without leaking vector embeddings or third-party data.
5. **Account Deletion**:
   - In student settings (`/dashboard/student/settings`), under "Delete Account", type `DELETE` and click "Delete forever".
   - Verify account is removed, user is signed out, and redirected to `/login/student?deleted=1`.
