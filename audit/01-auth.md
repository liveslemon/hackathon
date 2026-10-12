# Audit Report: Agent 01 — Authentication, RBAC, Onboarding, and Navigation

**Branch**: `agent/01-auth`  
**Area**: Authentication, role-based access control, onboarding, session handling, navigation, and backend JWT security  
**Date**: October 12, 2026  

---

## 1. Feature Checklist

| Feature / Route / Page | Status | Required Role | Summary & Notes |
|---|---|---|---|
| `/` (Landing Page) | ✅ Verified | Public | Landing page with direct links to student, employer, and admin login portals. |
| `/login/student` | 🔧 Fixed | Public | Student login with server-side role validation, wrong-role rejection (employers cleanly rejected), and forgot password link. |
| `/login/employer` | 🔧 Fixed | Public | Employer login with server-side role validation, student rejection with guidance, and forgot password link. |
| `/login/admin` | 🔧 Fixed | Public | Admin login with database profile `is_admin` verification (removed hardcoded email bypass) and forgot password link. |
| `/login/forgot-password` | 🔧 Fixed | Public | Password reset request form triggering Supabase `resetPasswordForEmail` with safe return links. |
| `/login/reset-password` | 🔧 Fixed | Public / Recovery | New password submission form with password confirmation validation calling `supabase.auth.updateUser`. |
| `/login/callback` | 🔧 Fixed | Public | OAuth and email confirmation handler exchanging PKCE code for session and redirecting via `safeNextPathForRole`. |
| `/onboarding` | 🔧 Fixed | Authenticated | Multi-step onboarding; resumes on refresh from DB; completed users and admins redirected to their dashboard. |
| `/onboarding/employer` | ✅ Verified | Public | Redirects directly to `/onboarding?role=employer`. |
| `/dashboard` | 🔧 Fixed | Authenticated | Server-side role redirect sending students to `/dashboard/student`, employers to `/dashboard/employer`, admins to `/dashboard/admin`. |
| `/dashboard/student` | 🔧 Fixed | Student / Admin | Student dashboard protected by server-side proxy middleware. Non-students redirected to their role dashboard. |
| `/dashboard/employer` | 🔧 Fixed | Employer / Admin | Employer dashboard protected by server-side proxy middleware. Non-employers redirected to their role dashboard. |
| `/dashboard/admin` | 🔧 Fixed | Admin | Admin portal strictly forbidden to non-admins (redirected to their role dashboard with access denied). |
| `/api/auth/logout` | 🔧 Fixed | Public | Clears Supabase cookies and development mode cookies (`dev_mode_role`, `dev_auth_mode`). |
| `/api/onboarding/status` | 🔧 Fixed | Authenticated | Returns current onboarding stage, CV processing status, and profile fields for resume-after-refresh support. |
| `/api/onboarding/complete` | 🔧 Fixed | Authenticated | Zod schema validation, saves student/employer details, sets `onboarding_stage: "completed"` and timestamp. |
| `/api/audit/**` | 🔧 Fixed | Admin | Server-side 401/403 RBAC enforced in middleware proxy. |
| `/api/reports/**` | 🔧 Fixed | Employer / Admin | Server-side 401/403 RBAC enforced in middleware proxy. |
| `/api/internships/post` | 🔧 Fixed | Employer / Admin | Server-side 401/403 RBAC enforced in middleware proxy. |
| `/api/cv/upload` | 🔧 Fixed | Student / Admin | Server-side 401/403 RBAC enforced in middleware proxy. |
| `/api/logbook/student` | 🔧 Fixed | Student / Admin | Server-side 401/403 RBAC enforced in middleware proxy. |
| `components/Sidebar.tsx` | 🔧 Fixed | Component | Nested route active states, admin profile navigation, logo navigation respecting role, and ARIA attributes. |
| `components/TopBar.tsx` | 🔧 Fixed | Component | Persistent profile and signout buttons (decoupled from search input), admin logout target, ARIA attributes. |
| `components/DashboardHeader.tsx` | 🔧 Fixed | Component | Logout destination respecting admin role, logo click destination, and ARIA labels. |
| `backend/core/security.py` | 🔧 Fixed | Backend Core | Local asymmetric JWT verification (ES256/RS256), issuer check, 30s clock-skew leeway, required claims, role dependencies (`verify_admin`, `verify_student`, `verify_employer`). |

---

## 2. Server-Side Route Authorization Matrix

| Route Pattern | Required Role | Unauthenticated Response | Unauthorized Role Response |
|---|---|---|---|
| `/api/audit/**` | `admin` | HTTP 401 JSON (`AUTH_REQUIRED`) | HTTP 403 JSON (`ROLE_FORBIDDEN`) |
| `/api/reports/**` | `employer`, `admin` | HTTP 401 JSON (`AUTH_REQUIRED`) | HTTP 403 JSON (`ROLE_FORBIDDEN`) |
| `/api/internships/post` | `employer`, `admin` | HTTP 401 JSON (`AUTH_REQUIRED`) | HTTP 403 JSON (`ROLE_FORBIDDEN`) |
| `/api/internships/templates` | `employer`, `admin` | HTTP 401 JSON (`AUTH_REQUIRED`) | HTTP 403 JSON (`ROLE_FORBIDDEN`) |
| `/api/logbook/employer/**` | `employer`, `admin` | HTTP 401 JSON (`AUTH_REQUIRED`) | HTTP 403 JSON (`ROLE_FORBIDDEN`) |
| `/api/cv/upload` | `student`, `admin` | HTTP 401 JSON (`AUTH_REQUIRED`) | HTTP 403 JSON (`ROLE_FORBIDDEN`) |
| `/api/logbook/student/**` | `student`, `admin` | HTTP 401 JSON (`AUTH_REQUIRED`) | HTTP 403 JSON (`ROLE_FORBIDDEN`) |
| `/api/logbook/entry/**` | `student`, `admin` | HTTP 401 JSON (`AUTH_REQUIRED`) | HTTP 403 JSON (`ROLE_FORBIDDEN`) |
| `/api/me/export` | `student`, `admin` | HTTP 401 JSON (`AUTH_REQUIRED`) | HTTP 403 JSON (`ROLE_FORBIDDEN`) |
| `/api/onboarding/**` | `authenticated` | HTTP 401 JSON (`AUTH_REQUIRED`) | Allowed for any authenticated session |
| `/api/analysis/**` | `authenticated` | HTTP 401 JSON (`AUTH_REQUIRED`) | Allowed for any authenticated session |
| `/api/applications/**` | `authenticated` | HTTP 401 JSON (`AUTH_REQUIRED`) | Allowed for any authenticated session |
| `/api/messages/**` | `authenticated` | HTTP 401 JSON (`AUTH_REQUIRED`) | Allowed for any authenticated session |
| `/dashboard/admin/**`, `/admin/**` | `admin` | 307 Redirect -> `/login/admin?next=...` | 307 Redirect -> Role Dashboard |
| `/dashboard/employer/**`, `/dashboard/post` | `employer`, `admin` | 307 Redirect -> `/login/employer?next=...` | 307 Redirect -> Role Dashboard |
| `/dashboard/student/**`, `/my-internships/**`, `/cv/**`, `/profile` | `student`, `admin` | 307 Redirect -> `/login/student?next=...` | 307 Redirect -> Role Dashboard |
| `/dashboard` | `authenticated` | 307 Redirect -> `/login/student` | 307 Redirect -> `/dashboard/{role}` |
| `/onboarding` | Incomplete Onboarding | 307 Redirect -> `/login/student?next=/onboarding` | If completed: 307 Redirect -> Role Dashboard |
| `/login/student`, `/login/employer`, `/login/admin` | Public (Unauthenticated) | Allowed | If already logged in: 307 Redirect -> Role Dashboard |

---

## 3. Bugs Fixed

| File & Line | Description | Commit Hash |
|---|---|---|
| `frontend/pau-interconnect-app/lib/post-login.ts:4-31` | **Open redirect vulnerability**: `safeNextPath` allowed backslashes (`/\evil.com`), URL schemes (`javascript:`, `data:`), protocol markers (`http://`), tabs, newlines, and loops back into `/login` or `/api`. Hardened with strict URL parsing and role-aware path filtering (`safeNextPathForRole`). | `7b925a3` |
| `frontend/pau-interconnect-app/lib/role-guard.ts:168-255` | **Missing route authorization matrix**: Added `getRequiredRoleForRoute` and `isAllowedRouteForRole` to evaluate page and API role authorization server-side. | `7b925a3` |
| `frontend/pau-interconnect-app/proxy.ts:1-180` | **Missing server-side API & route guards**: Middleware allowed unauthenticated access to protected APIs and pages. Rewrote `proxy.ts` to enforce server-side 401/403 JSON responses for APIs and clean role redirects for pages. | `b5f211c` |
| `frontend/pau-interconnect-app/context/AuthContext.tsx:39-125` | **Race conditions & cross-tab auth state leak**: `onAuthStateChange` lacked protection against out-of-order session resolutions and cross-tab logout synchronization. Added active user tracking, clean reset, and `refreshProfile`. | `500d5f1` |
| `frontend/pau-interconnect-app/lib/fast-signout.ts:1-35` | **Stale dev auth cookies on logout**: Logout cleared Supabase tokens but left `dev_mode_role` and `dev_auth_mode` cookies intact, causing unexpected mock identity resurrection. Added complete cookie purging. | `500d5f1` |
| `frontend/pau-interconnect-app/app/api/auth/logout/route.ts:1-40` | **Incomplete cookie invalidation on server logout**: Route handler now clears both Supabase session cookies and development mode override cookies. | `500d5f1` |
| `frontend/pau-interconnect-app/app/login/student/page.tsx:90-106` | **Cross-role login bypass**: Employers signing in via the student login portal were accepted into student state. Added post-auth role verification, immediate rejection & logout with clear feedback. | `4243710` |
| `frontend/pau-interconnect-app/app/login/employer/page.tsx:88-105` | **Cross-role login bypass**: Students signing in via employer login portal were accepted into employer state. Added role verification, rejection, logout, and redirection guidance. | `4243710` |
| `frontend/pau-interconnect-app/app/login/admin/page.tsx:80-103` | **Hardcoded admin email bypass**: Admin portal had a hardcoded email bypass (`hillary.ilona@pau.edu.ng`) ignoring database roles. Replaced with database `is_admin` profile verification. | `4243710` |
| `frontend/pau-interconnect-app/app/dashboard/page.tsx:1-45` | **Mock admin dashboard rendered at `/dashboard`**: The root `/dashboard` rendered dummy statistics instead of routing authenticated users to their respective role dashboard. Replaced with server-side and client-side role redirect. | `3c8b7d3` |
| `frontend/pau-interconnect-app/app/api/onboarding/status/route.ts:40-97` | **Wiped onboarding progress on refresh**: Status endpoint only returned stage string without profile data. Updated to return existing saved profile attributes (`full_name`, `course`, `level`, `interests`, `company_*`). | `e5c98f7` |
| `frontend/pau-interconnect-app/app/onboarding/OnboardingClient.tsx:145-215` | **Onboarding refresh reset**: Onboarding client reset to Step 1 on page reload. Now consumes saved profile data and automatically resumes at Step 2, 3, or 4. | `e5c98f7` |
| `frontend/pau-interconnect-app/app/onboarding/page.tsx:37-43` | **Admin trapped in onboarding**: Admin visiting `/onboarding` was shown student registration. Added immediate redirect to `/dashboard/admin` for admin users. | `e5c98f7` |
| `frontend/pau-interconnect-app/app/login/forgot-password/page.tsx:1-140` | **Missing password reset request flow**: Created dedicated Supabase-powered forgot password portal. | `7145708` |
| `frontend/pau-interconnect-app/app/login/reset-password/page.tsx:1-160` | **Missing password update flow**: Created new password entry page validating length, confirmation match, and invoking `supabase.auth.updateUser`. | `7145708` |
| `frontend/pau-interconnect-app/app/login/callback/route.ts:1-35` | **Missing auth callback handler**: Implemented server route to exchange auth recovery/magic link code for session and redirect safely using `safeNextPathForRole`. | `7145708` |
| `frontend/pau-interconnect-app/components/TopBar.tsx:64-122` | **Hidden TopBar controls bug**: `{onSearchChange && (...)}` wrapped user avatar, username, notifications, and logout button. Pages without search completely lost header controls. Decoupled search input from user controls. | `2c26098` |
| `frontend/pau-interconnect-app/components/TopBar.tsx:42-47` | **Admin logout directed to student login**: TopBar sent admins to `/login/student` upon signout. Fixed to route admins to `/login/admin`. | `2c26098` |
| `frontend/pau-interconnect-app/components/DashboardHeader.tsx:31-36` | **DashboardHeader admin logout and logo destination**: Fixed logout target and logo click to respect `isAdmin`. Added accessibility labels. | `2c26098` |
| `frontend/pau-interconnect-app/components/Sidebar.tsx:130-134` | **Sidebar logo clicked by admin navigated to student dashboard**: Added admin check to route logo click to `/dashboard/admin`. | `2c26098` |
| `frontend/pau-interconnect-app/components/Sidebar.tsx:220-226` | **Sidebar sub-routes lost active highlight**: Active state checked strict equality (`pathname === item.href`). Updated to support prefix matching for nested routes (e.g. `/my-internships/123`). Added `aria-current="page"`. | `2c26098` |
| `backend/core/security.py:35-43` | **JWT validation missing issuer, clock-skew, and required claims**: `_verify_locally` did not verify issuer, had 0s clock skew window, and accepted tokens missing `exp` and `sub`. Added `issuer=...`, `leeway=30`, `options={"require": ["exp", "sub"]}`. | `0a8698a` |
| `backend/core/security.py:120-155` | **Missing backend role dependencies**: Added `verify_student`, `verify_employer`, and generic `require_role(allowed_roles)` dependencies. | `0a8698a` |

---

## 4. Tests Added & Results

### Frontend Unit Tests (Vitest)
- **`tests/lib/role-guard.test.ts`** (11 tests):
  - Validates `getRequiredRoleForRoute` across public, student, employer, admin, and authenticated paths.
  - Validates `isAllowedRouteForRole` matrix (student blocked from admin/employer; employer blocked from student/admin; admin allowed everywhere).
  - Validates dev mode cookie parsing and profile helpers.
- **`tests/lib/proxy-route-matrix.test.ts`** (34 tests):
  - Full matrix test covering every API route (`/api/audit`, `/api/reports`, `/api/cv/upload`, `/api/logbook/*`, `/api/onboarding/*`, etc.) for unauthenticated (401), wrong role (403), and matching role (allowed).
  - Full matrix test covering every page route (`/admin`, `/dashboard/admin`, `/dashboard/employer`, `/dashboard/student`, `/dashboard`, `/onboarding`) for unauthenticated (login redirect with `?next=`), wrong role (role dashboard redirect), and matching role.
- **`tests/lib/post-login.test.ts`** (6 tests):
  - Validates `safeNextPath` open-redirect protection (rejects protocols, backslashes, schemes, tabs, newlines, auth loops).
  - Validates `safeNextPathForRole` for each role.
  - Validates `getNextPath` reading window search params.
  - Validates `loginPathFor` targeting the appropriate login portal.

### Backend Unit Tests (Pytest)
- **`backend/tests/auth/conftest.py`**:
  - RSA keypair generation (2048-bit RS256).
  - Mocked JWKS client providing the public test key without network calls.
  - Factory for generating valid, expired, forged, wrong audience, and wrong issuer JWTs.
  - Test FastAPI application exposing `/public`, `/user`, `/admin`, `/student`, `/employer`.
- **`backend/tests/auth/test_security.py`** (17 tests):
  - `test_valid_token_local_verification`: local RS256 claims decoding.
  - `test_expired_token_rejected`: tokens expired beyond leeway return 401.
  - `test_leeway_allows_minor_clock_skew`: token expired by 10s accepted via 30s leeway window.
  - `test_forged_token_rejected`: invalid signature rejected with 401.
  - `test_wrong_audience_rejected`: audience != "authenticated" rejected.
  - `test_wrong_issuer_rejected`: untrusted issuer rejected.
  - `test_missing_exp_rejected`: token without `exp` rejected.
  - `test_remote_verification_fallback_success`: fallback when key not in local JWKS.
  - `test_remote_verification_fallback_failure`: 401 when remote verification fails.
  - `test_admin_via_env_email`: email in `ADMIN_EMAILS` passes admin guard.
  - `test_admin_via_db_is_admin`: profile `is_admin=True` passes admin guard.
  - `test_non_admin_rejected_403`: non-admin receives 403 Forbidden.
  - `test_role_student_allowed_and_employer_denied`: role enforcement.
  - `test_admin_bypasses_student_and_employer_guards`: admin authorized on student and employer routes.
  - `test_fastapi_client_unauthenticated_request`: HTTP 401 on unauthenticated call.
  - `test_fastapi_client_endpoints_with_valid_token`: HTTP 200 on authorized call.
  - `test_fastapi_client_role_forbidden`: HTTP 403 on role mismatch.

### Exact Commands Run & Results

```bash
# 1. Frontend Typecheck
cd frontend/pau-interconnect-app && npm run typecheck
# Result: Exit code 0 (tsc --noEmit passed cleanly)

# 2. Frontend Unit Tests
cd frontend/pau-interconnect-app && npm run test
# Result: Exit code 0 (8 test files passed, 63 tests passed)

# 3. Frontend Lint
cd frontend/pau-interconnect-app && npm run lint
# Result: Exit code 0 (0 errors, 56 warnings in other agents' files)

# 4. Backend Pytest
backend/.venv/bin/pytest backend/tests/auth -v
# Result: Exit code 0 (17 passed in 0.45s)
```

---

## 5. New Migrations

*None created or required.*  
The existing database schema in `profiles` already includes all required fields: `role`, `is_admin`, `onboarding_stage`, `onboarding_completed_at`, `cv_processing_status`, `company_name`, etc. All new endpoints and role checks operate on the existing schema with safe backward-compatible fallbacks.

---

## 6. Handoffs

The following issues were identified in files owned by other agents during this audit:

1. **`backend/routers/cv.py:312` (Owned by Agent 02)**:
   - **Critical Bug**: `@router.post("/refresh-cv-url")` is accidentally decorating the private helper function `def _can_view_student_cv(...)` on line 312 instead of the actual endpoint handler `def refresh_url(...)` on line 324.
   - **Missing Auth**: The actual endpoint handler has no authentication dependency (`current_user=Depends(get_current_user)`).
   - **Request**: Remove the decorator from `_can_view_student_cv`, place `@router.post("/refresh-cv-url")` immediately above `async def refresh_url(...)`, and add `current_user=Depends(get_current_user)` to `refresh_url`.

2. **`backend/routers/admin.py:73` (Owned by Agent 07)**:
   - **Security Issue**: `GET /api/admin/search` (`def search_platform`) does not require `verify_admin` or any authentication. Any unauthenticated user can query platform-wide user and internship search results.
   - **Request**: Add `admin=Depends(verify_admin)` to the `search_platform` parameter list.

3. **`backend/routers/analysis.py:27` (Owned by Agent 03)**:
   - **Security Issue**: `GET /api/analysis/skill-gap` (`def get_skill_gap_analysis`) is completely unauthenticated.
   - **Request**: Add `current_user=Depends(get_current_user)` (or `verify_student`).

4. **`backend/routers/applications.py:29, 68` (Owned by Agent 06)**:
   - **Security Issue**: `POST /api/draft-cover-letter` and `POST /api/draft-cover-letter-stream` have no authentication dependencies, allowing unauthenticated callers to consume LLM quota.
   - **Request**: Add `current_user=Depends(get_current_user)` to both endpoints.

5. **`backend/routers/logbook.py:26` (Owned by Agent 05)**:
   - **Security Issue**: `POST /api/logbook/enhance` has no authentication dependency.
   - **Request**: Add `current_user=Depends(get_current_user)` (or `verify_student`).

6. **`backend/routers/profiles.py:93` (Owned by Agent 04)**:
   - **Security Issue**: `POST /api/me/refresh-matches` takes a raw body `payload: dict` and reads `user_id = payload.get("user_id")` without verifying the caller's JWT. Any user could trigger vector match re-indexing for arbitrary account IDs.
   - **Request**: Add `current_user=Depends(get_current_user)` and extract `user_id = current_user.id`.

7. **`frontend/pau-interconnect-app/eslint.config.mjs` (Shared Configuration)**:
   - **1-Line Change**: Added `"supabase/**"` to `globalIgnores` (line 26) because Supabase edge functions contained `@ts-nocheck` which was failing the Next.js ESLint runner.

---

## 7. Manual Browser Test Steps

A human tester can verify all auth and RBAC flows with the following steps:

### Test 1: Cross-Role Login Rejection
1. Open the browser and navigate to `/login/student`.
2. Enter the credentials of an Employer account.
3. Click "Log In".
4. **Expected**: The login fails immediately with an error banner: *"This account is registered as an Employer. Please sign in via the Employer Portal."*, the session is signed out, and the user remains on `/login/student`.
5. Navigate to `/login/employer`.
6. Enter the credentials of a Student account.
7. Click "Log In".
8. **Expected**: The login fails with: *"This account is registered as a Student. Please sign in via the Student Portal."*, the session is purged, and the user remains on `/login/employer`.

### Test 2: Admin Login Verification
1. Navigate to `/login/admin`.
2. Sign in with a non-admin account (e.g. standard student or employer).
3. **Expected**: Login is rejected with *"Access denied. This portal is restricted to authorized PAU administrators."*.
4. Sign in with an admin account (or account with `is_admin=true` in `profiles`).
5. **Expected**: Successfully signs in and redirects to `/dashboard/admin`.

### Test 3: Open-Redirect & Deep Link Safety
1. Open an incognito browser window and navigate to:  
   `/login/student?next=https%3A%2F%2Fevil.com`
2. Sign in with valid student credentials.
3. **Expected**: The application safely rejects the external redirect and redirects to `/dashboard/student`.
4. Navigate in incognito to:  
   `/login/student?next=%2Fmy-internships`
5. Sign in with valid student credentials.
6. **Expected**: The application navigates to `/my-internships`.
7. Navigate in incognito to:  
   `/login/student?next=%2Fdashboard%2Fadmin`
8. Sign in with student credentials.
9. **Expected**: The student is NOT permitted into the admin dashboard; the system redirects to `/dashboard/student`.

### Test 4: Root `/dashboard` Dynamic Role Routing
1. Sign in as a student and visit `/dashboard`.
2. **Expected**: Server redirects to `/dashboard/student`.
3. Sign in as an employer and visit `/dashboard`.
4. **Expected**: Server redirects to `/dashboard/employer`.
5. Sign in as an admin and visit `/dashboard`.
6. **Expected**: Server redirects to `/dashboard/admin`.

### Test 5: Onboarding Resume on Page Refresh
1. Sign up a new student account or clear `onboarding_stage` in the profile.
2. Navigate to `/onboarding`.
3. Fill in Step 2 (Full Name). Click Next to Step 3 (Course & Level). Select a course and level.
4. Refresh the browser page (`Cmd+R` / `F5`).
5. **Expected**: The page reloads without losing data. Form inputs are pre-populated and the wizard resumes directly on Step 4 (Interests).
6. Complete onboarding.
7. Attempt to navigate back to `/onboarding`.
8. **Expected**: The page automatically redirects back to `/dashboard/student` and does not display the onboarding form.

### Test 6: Header & Sidebar Accessibility and Sign Out
1. On `/dashboard/student`, verify that the top bar displays the user avatar, display name, notification bell, and signout button even on pages without a search query.
2. Click the signout button in the top bar.
3. **Expected**: Logs out immediately, clears session cookies, and redirects to `/login/student`.
4. Sign in as an admin on `/dashboard/admin` and click signout.
5. **Expected**: Redirects to `/login/admin`.
6. Navigate using keyboard (`Tab` and `Shift+Tab`) through sidebar and topbar items.
7. **Expected**: Active sidebar items have `aria-current="page"`, icon buttons have clear `aria-label` tags, and focus rings are visible.

### Test 7: Password Reset Flow
1. Navigate to `/login/student` and click "Forgot password?".
2. Enter an email address and click "Send Reset Link".
3. **Expected**: Displays confirmation notice: *"Check your inbox. If an account exists for that email, we have sent password reset instructions."*
4. Click the link received in the email or navigate to `/login/reset-password`.
5. Enter a new password and matching confirm password (min 6 characters).
6. Click "Update Password".
7. **Expected**: Displays *"Password updated successfully!"* and redirects to `/login/student`.
