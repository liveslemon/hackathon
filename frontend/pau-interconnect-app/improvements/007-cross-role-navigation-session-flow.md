# Cross-Role Navigation + Session Flow

## Current Walkthrough

1. User logs in and is redirected based on profile role.
2. Route guards exist in multiple pages and wrappers.
3. Dev-mode role switching can alter access in local workflows.
4. Settings and dashboard pages independently check profile role.

## Slip-ups Observed

1. Redirect targets are inconsistent (`/login`, `/login/student`, `/login/employer`, `/`).
2. Role checks are duplicated across many route files with subtle differences.
3. Profile shape assumptions vary (nullable fields + fallback logic differ by page).
4. Dev mode behavior may mask production auth edge cases.

## Improvement Plan

### A. Normalize redirect map

- One source of truth for unauthenticated and unauthorized redirects by role.

### B. Single reusable role guard

- Build shared guard helpers for server pages and API routes.
- Return typed guard results (`allow`, `redirect`, `reason`).

### C. Unify profile contract

- Define normalized profile model and parsing utility.
- Disallow ad hoc shape checks across route components.

### D. Harden dev mode boundaries

- Gate dev role overrides behind explicit non-production checks and flags.

## Acceptance Criteria

1. Redirect behavior is consistent for all auth states across roles.
2. All role gating routes use shared guard utility.
3. Profile parsing is centralized and strongly typed.
4. Dev role overrides cannot leak into production behavior.

## Priority

- Priority: High
- Impact: High
- Effort: Medium
