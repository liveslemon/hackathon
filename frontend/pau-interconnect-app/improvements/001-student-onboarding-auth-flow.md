# Student Onboarding + Authentication Flow

## Current Walkthrough

1. Student lands on `/` and clicks Student login or onboarding.
2. If new, student enters onboarding steps in `OnboardingClient`:
   - Personal details
   - Course
   - Level
   - Interests + CV upload
3. `handleSubmit` creates auth account (if no existing user), inserts profile row, and starts async CV analysis.
4. Student is shown "Complete" and can proceed to dashboard.
5. Existing students login via `/login/student` and are redirected by role guard.

## Slip-ups Observed

1. Client-only profile creation during onboarding can partially succeed (auth success, profile write failure).
2. CV analysis is fire-and-forget in onboarding, with no durable status tracking in the UI.
3. Login flow contains profile sync behavior (`pendingProfile`) that mixes concerns with auth.
4. Onboarding step validation is minimal and mostly front-end only.
5. Error messaging is inconsistent and often non-actionable.

## Improvement Plan

### A. Move onboarding completion to a single server transaction boundary

- Introduce a backend endpoint that performs:
  - auth-linked profile validation
  - role assignment
  - onboarding completion marker
- Return a normalized result contract (`status`, `nextStep`, `message`).

### B. Add onboarding state machine

- Persist onboarding stage (`started`, `profile_saved`, `cv_processing`, `completed`) in DB.
- Resume from last known stage on refresh/re-login.

### C. Make CV analysis job-driven

- Store job row with `queued | processing | failed | complete`.
- Show a deterministic progress state and retry action.

### D. Separate auth from profile recovery

- Remove `pendingProfile` local recovery path from login page.
- Put recovery/repair in a dedicated repair endpoint or migration script.

## Acceptance Criteria

1. New student cannot reach "complete" without persistent onboarding completion state.
2. Failed profile write does not leave an orphaned auth state without remediation path.
3. CV analysis status is visible and survives refresh.
4. Login page performs authentication only (no profile mutation side effects).
5. All onboarding errors map to user-safe and actionable messages.

## Priority

- Priority: High
- Impact: High
- Effort: Medium
