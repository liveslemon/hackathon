# Employer dashboard `/dashboard/employer`

**Files:** `page.tsx`, `EmployerClient.tsx`, `EmployerParts.tsx`, `EmployerActivityClient.tsx`, `EmployerQuickActionsClient.tsx`,
`EmployerInternshipListClient.tsx` (1,730 lines in total)  **Seen:** ✅ light and dark (mock: no data)

## Today
"Recruitment Overview · Managing <Company>'s activity", three quick-action pills (Add Posting · My Hub · Logbooks), then
nothing when there's no data. With data (from code): KPI row (Active Postings, Total Applicants, Acceptance Rate, Pending
Reviews), New Candidates, Pending Reviews, the postings list with filters, and a **"Create New Internship" modal** with its
own copy of the posting form (04 R-5).

## Problems
1. Empty dashboard = a title and three buttons. A new employer has no idea what to do first.
2. "My Hub" is vague.
3. A third posting form lives in a modal here.
4. "Acceptance Rate" is ambiguous (offers accepted? candidates accepted by you?).

## Redesign
| Priority | Change |
|---|---|
| P1 | **New-employer checklist** (until it's done): ✓ Company profile · ◻ Verification (pending, see status) · ◻ Post your first role · ◻ Invite a colleague (F-1) · ◻ Review your first applicant. |
| P1 | KPI row with defined metrics: Open roles · New applicants (7 d) · Awaiting your review · Interns on placement · Logbook weeks to sign. Each links to a filtered list. |
| P1 | An **"Needs you"** list: applicants waiting more than 3 days, offers expiring, weeks awaiting sign-off, unread messages. This is the employer's to-do list. |
| P1 | Remove the posting modal; "Post a role" opens `/dashboard/post` (one form). |
| P2 | A pipeline snapshot per open role (a mini funnel bar), with the role's top-3 candidates (avatars + match). |
| P2 | Rename the actions: "Post a role", "Review applicants", "Sign logbooks". |
| P3 | A Monday digest preview ("This is what we'll email you", W-6). |
