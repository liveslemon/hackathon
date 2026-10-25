# Manage platform `/dashboard/admin?tab=manage`

**File:** `manage/ManagePlatformView.tsx`  **Seen:** ✅ light and dark (mock: empty, with an error banner)

## Today
"Platform Management · Inspect directory, verify employers, and manage platform safety"; KPI chips (Companies (0
verified), Students); a directory filter + Refresh; "Registered Employers & Organizations" table (Company,
Representative, Verification, Account Status, Admin Actions); "Registered Students" table (Student Name, Course/Level, CV
Status, Status/Role, Action). Verify/unverify and suspend/reinstate use `ConfirmDialog`.

## Problems
1. Hand-built tables; `DataTable` exists unused (G-6). No pagination, sorting or column filters.
2. Suspend has no effect (P0-4), and verify has no effect (P1-4). The UI implies both work.
3. Verification has no evidence to look at (CAC no., website, email domain).
4. Students and employers are on one long page.

## Redesign
| Priority | Change |
|---|---|
| P1 | Split into **Verification** (a queue), **Users** (a `DataTable` with role tabs: Students · Employers · Staff) and **Postings** (moderation). |
| P1 | Verification queue card per company: name, website (it opens), email domain vs website domain ✓/✗, CAC no., created date, postings drafted. Actions: Approve · Request info · Reject (each with a reason, emailed). |
| P1 | User row actions: View profile · View as (read-only, audited, F-12) · Suspend (really bans, P0-4) · Reset password · Resend verification. |
| P1 | Suspended or unverified state shown with `StatusPill`, plus the reason and who did it (from `decision_audit_log`). |
| P2 | Bulk: approve selected, export CSV. |
| P2 | Audit log tab: who did what, when, with a filter by actor and action. |
