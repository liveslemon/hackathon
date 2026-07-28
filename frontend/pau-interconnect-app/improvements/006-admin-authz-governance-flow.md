# Admin AuthZ + Governance Flow

## Current Walkthrough

1. Admin logs in via `/login/admin`.
2. App verifies user and checks `is_admin` profile flag.
3. Admin dashboard tabs expose overview, analytics, posting, and platform management.
4. Admin search and logout are available in shared admin shell.

## Slip-ups Observed

1. Special-case hardcoded admin email bypass exists in admin login/dashboard checks.
2. Authorization rules are split across multiple pages and risk divergence.
3. Admin actions lack a unified policy layer and explicit RBAC matrix.
4. Search/governance screens expose broad data without clear action audit boundaries.

## Improvement Plan

### A. Remove hardcoded admin bypass logic

- Replace email allowlist shortcut with policy-backed role claims only.

### B. Centralize admin authorization

- Introduce one server guard utility for admin routes and server actions.
- Reuse same guard in API endpoints and page loaders.

### C. Define role capability matrix

- Document and enforce permissions by role/capability.
- Include granular scopes for read/write/delete actions.

### D. Add admin audit trail

- Log privileged actions and data-changing operations.
- Include actor, action, target, timestamp.

## Acceptance Criteria

1. No hardcoded identity shortcuts in authz path.
2. All admin pages/actions use one authorization guard.
3. Capability matrix exists and is enforced in backend.
4. Admin mutations generate auditable logs.

## Priority

- Priority: Critical
- Impact: High
- Effort: Medium
