# My internships `/my-internships`

**Files:** `page.tsx`, `MyInternshipsParts.tsx` (308 lines)  **Seen:** code 🔎

## Today
Sections: "Upcoming Application Deadlines", "Applied Internships", "Saved Internships", with empty states ("No applications
submitted yet", "Your wishlist is empty"). **There's no withdraw button**, although `POST /api/applications/[id]/withdraw`
exists.

## Improvements
| Priority | Change |
|---|---|
| P1 | **Tabs**: Applied · Interviews · Offers · Saved · Archived (rejected, withdrawn, closed). A count on each. |
| P1 | Each application row expands into a **timeline** (`DecisionTimeline` exists): submitted → reviewed → … with dates, plus "What happens next" copy per state. |
| P1 | **Withdraw** with `ConfirmDialog` ("GreenStack will be told you withdrew. You can't re-apply to this role.") |
| P1 | Offers get a prominent card: start/end dates, stipend, **Accept / Decline**, a deadline countdown (F-4). Accepting withdraws the others, so say so. |
| P2 | Interviews tab: date/time, a join link, add to calendar, reschedule request (F-3). |
| P2 | Saved: sort by deadline; remove with **Undo** (toast) instead of a confirm. |
| P3 | A "Your search at a glance" funnel: applied 8 → reviewed 5 → interview 2 → offer 1. |
