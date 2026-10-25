# SIWES logbook `/dashboard/student/logbook`

**Files:** `page.tsx`, `LogbookClient.tsx` (~720 lines)  **Seen:** code 🔎 + earlier integration review

## Today
"SIWES Logbook" PageHeader; a placement selector; a date picker for a new entry (7-day backfill window); a textarea plus
**AI Enhance** (with a preview); a "Logged Days (N)" list with status pills (pending / approved / flagged); flagged entries
can be corrected; "Mark Internship Complete"; `window.confirm` on one action. The empty state: "No Active Internship
Placement" with "Browse Internships".

## Improvements
| Priority | Change |
|---|---|
| P1 | **Week view as the default**: a Mon–Fri row of day cells (logged ✓ / missing ○ / flagged ⚑ / future), click to edit. The week's sign-off status sits on the right (F-8). |
| P1 | **Today first**: if today isn't logged, the composer is open at the top with a prompt ("What did you work on today?"), tool and skill chips, hours spent. |
| P1 | Streak + compliance: "9-day streak · 94% of placement days logged". Nudge after 2 missed days. |
| P1 | Flagged entries surface at the top with the supervisor's note and a **Fix** button. |
| P1 | Replace `window.confirm` (G-5). "Mark internship complete" moves to the end-of-placement flow (F-9), not a casual button. |
| P2 | AI Enhance shows a **side-by-side diff** (yours vs enhanced) with Accept / Edit / Keep mine. It never auto-replaces. |
| P2 | Attachments per entry (a photo of work, a diagram), stored in a private bucket. |
| P2 | Offline drafts (localStorage now; the PWA later, W-10). |
| P3 | Voice note → entry (W-7). |
