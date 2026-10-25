# Student dashboard `/dashboard/student`

**Files:** `Dashboard.tsx`, `DashboardParts.tsx`, `DashboardClientWrapper.tsx`, `CareerMetrics.tsx`, `CvPromptCard.tsx`
(1,272 lines in total)  **Seen:** ✅ light and dark (mock data)

## Today (top to bottom)
1. 4 KPI tiles: Career Score **0**, ATS Readiness **0%**, Weekly Goal 0%, Activity Streak 0 days.
2. "Upload your CV for automated match scoring" banner + Upload CV.
3. "Today's logbook check-in" card, showing a dev string in mock mode ("Your dev profile is now active…", "SYNCED PROFILE").
4. Internships panel: "2 opportunities available", Filters, sort ("Best Match"), category chips, an interests filter.
5. The card grid (see shared/internship-card.md).

## Problems
1. **Four zeros** greet a new student. Career Score, ATS Readiness and Weekly Goal aren't explained, and "Weekly Goal" has no
   goal-setting anywhere.
2. Three stacked banners before the content, all saying roughly "do something".
3. The logbook check-in shows even when there's no placement.
4. Filters live in two places (chips + the Filters button); the "Your interests" row duplicates the chips.
5. Discovery is capped by loading everything client-side (05 PF-1).

## Redesign
```
┌ Next step coach (W-1) ───────────────────────────────────────────────┐
│ "Upload your CV: it unlocks match scores on 25 open roles."  [Upload]│
└──────────────────────────────────────────────────────────────────────┘
┌ My pipeline ──────────┐ ┌ Logbook (if placed) ──┐ ┌ Profile strength ─┐
│ 3 applied · 1 interview│ │ Today: not logged  ✎  │ │ 72%  +2 projects  │
└───────────────────────┘ └───────────────────────┘ └───────────────────┘
Recommended for you (sorted by match) ·  [Search…] [Filters ▾] [Sort ▾]
[card] [card] [card]
[card] [card] [card]                       ← paginated / infinite scroll
Closing soon  ·  Saved                      ← horizontal rails
```
| Priority | Change |
|---|---|
| P1 | Replace the 4 KPI tiles with **3 meaningful cards**: My pipeline (counts per stage, links to /my-internships), Logbook (only when placed: today's status + streak), Profile strength (a % + the top suggestion). |
| P1 | **One** contextual coach card at the top (W-1), not three banners. |
| P1 | Server-side paginated feed (PF-1): 24 per page, search, filters as a single popover with chips showing the active filters. |
| P2 | Rails: "Closing soon", "Saved", "New this week". |
| P2 | Empty states: no matches yet → "Upload your CV"; no roles → "New roles are posted most weeks. Turn on alerts" (F-6). |
| P3 | Remember the last filters per student (localStorage). |

## Remove
- "Career Score" and "ATS Readiness" as headline numbers, until they're defined and reliable. Keep ATS on the CV page with
  an explanation.
- Dev-only strings ("dev profile", "SYNCED PROFILE"); gate them behind dev mode.
