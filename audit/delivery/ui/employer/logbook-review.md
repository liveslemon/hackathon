# Logbook review `/dashboard/employer/logbook`

**Files:** `page.tsx`, `LogbookReviewClient.tsx` (~536 lines)  **Seen:** code 🔎

## Today
"Logbook Reviews": a list of pending entries; select → "Approve Selected (n)"; "Request Entry Revision" modal with
"Revision Guidance & Notes"; an empty state "All caught up!".

## Improvements
| Priority | Change |
|---|---|
| P1 | **Group by intern, then by week.** Each week row shows Mon–Fri status, hours, and **Sign week** (one action, F-8). Expand to read the entries. |
| P1 | An inline revision request per entry (a popover with the note), not only the modal. The student sees it in place. |
| P1 | Overdue indicator: weeks waiting more than 3 days are highlighted; a reminder email goes to the supervisor. |
| P2 | Assignment: only interns assigned to *this* industry supervisor show by default (F-1); a "Show all company interns" toggle for owners. |
| P2 | Keyboard: `A` approve the week, `F` flag, `N` next intern. |
| P3 | A monthly summary per intern ("19 days logged, 2 revisions") for the evaluation form (F-9). |
