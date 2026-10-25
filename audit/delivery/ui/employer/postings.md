# My postings `/dashboard/employer/internships`

**Files:** `page.tsx` (64 lines) + `EmployerInternshipListClient.tsx`  **Seen:** code 🔎

## Today
A "My Postings" list with status filters and close/reopen actions (with confirmation).

## Improvements
| Priority | Change |
|---|---|
| P1 | Use `DataTable` (built, unused): columns Role · Status · Applicants (new / total) · Views · Deadline · Slots filled · Actions. Mobile: a card list. |
| P1 | Status tabs: Active · Drafts · Closed · Expired, with counts. |
| P1 | Row actions menu: View applicants · Edit · Duplicate (new) · Close / Reopen · Share link. |
| P2 | An inline "deadline passed, extend?" prompt on expired rows. |
| P2 | Bulk: close selected, extend deadline. |
| P3 | Views → applications conversion per role, with a hint when it's low ("Add a stipend; roles with one get 2× applications"). Only once there's enough data to say so honestly. |
