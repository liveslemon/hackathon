# Internship card and grid

**Files:** `components/InternshipCard.tsx`, `InternshipGrid.tsx`, `components/match/MatchScore.tsx`
**Seen:** ✅ student dashboard (light and dark)

## Today
A stock photo header, a match % chip at the top left, a heart (save) at the top right, the role, the company, location and
status ("Closed"), a category tag, the application status pill ("Pending", "Applied"), and a 6-dot progress track with a
label.

## Problems
1. **The stock photo is the same on every card.** It takes 40% of the card and says nothing. Company logos are what people
   scan for.
2. "Closed" internships with "Applied" status sit in the same grid as open ones, with no visual difference.
3. The 6-dot progress track has no labels on hover; "Applied" at the end repeats the pill.
4. Match % is a small chip on an image. The most valuable signal is visually the weakest.
5. There's no deadline urgency ("Closes in 3 days"), no stipend, no remote/on-site icon, and no "Verified" badge.

## Redesign
```
┌────────────────────────────────────────────┐
│ [logo]  Frontend Engineering Intern   ♡    │
│         GreenStack · ✓ Verified            │
│                                            │
│  ◉ 88% match   ⏱ Closes in 3 days          │
│  📍 Remote · 6 months · ₦80k/mo             │
│  React  TypeScript  +3                     │
│ ─────────────────────────────────────────  │
│  Applied · Under review          View →    │
└────────────────────────────────────────────┘
```
| Priority | Change |
|---|---|
| P1 | Remove the stock image; use a company logo (with a monogram fallback, colour from a hash of the name). |
| P1 | Make the match ring the primary signal (MatchScore ring variant), with the explainer on hover/tap (W-4). Show "Upload CV to see match" for unscored, never 0%. |
| P1 | A deadline urgency chip (warning tokens when < 7 days, danger when < 48 h). |
| P1 | Closed or expired roles: muted card plus a "Closed" ribbon; sort them last. Hide them unless the student applied. |
| P2 | Key facts row: work mode icon, duration, stipend (if present). Up to 3 skill tags + "+N". |
| P2 | Footer: application state in words + the next step, replacing the unlabeled 6-dot track. |
| P2 | Skeleton card that matches this layout exactly. |
| P3 | Swipe to save / dismiss on mobile ("Not interested" trains the ranking). |
