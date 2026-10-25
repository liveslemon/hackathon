# SIWES reports `/dashboard/employer/reports`

**Files:** `page.tsx`, `ReportsClient.tsx` (~285 lines)  **Seen:** code 🔎

## Today
"SIWES Compliance Reports": Report Scope & Date Filter (All Active Interns / a student filter, From and To dates), Active
Intern Summary, CSV/PDF export, and an empty state "No active interns".

## Improvements
| Priority | Change |
|---|---|
| P1 | Report types as cards: Weekly sign-off summary · Attendance (days logged) · Intern evaluation (F-9) · ITF placement confirmation. Each has a preview, then a download. |
| P1 | Generate PDFs server-side (the same engine as logbook print), with the company and PAU headers, page numbers and signatures. |
| P2 | Scheduled reports: "Email me the weekly summary every Friday". |
| P2 | Remember the last filters. |
