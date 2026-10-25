# Profile editor `/profile`

**Files:** `page.tsx`, `ProfileClient.tsx` (1,770 lines in total)  **Seen:** code 🔎

## Today
"Profile & Skills" with section tabs: Personal & Academic · Skills & Interests · Experience & Projects · Certifications &
Links. Repeatable lists (Add Role, Add Project, Add Certificate, Add Language). "Professional Summary & Bio", "Career
Interests & Matching Preferences", "View Public". Saving triggers a re-match. A `window.confirm` unsaved-changes guard.

## Problems
1. One 1,770-line component: hard to change safely, and every keystroke re-renders the whole page.
2. Saving re-runs matching, but the student doesn't see the effect.
3. Nothing tells the student which fields actually improve their matches.

## Redesign
| Priority | Change |
|---|---|
| P1 | Split it into section components (`PersonalSection`, `SkillsSection`, `ExperienceSection`, `ProjectsSection`, `LinksSection`), each with its own form state (react-hook-form + zod, already a dependency) and **its own save** ("Saved ✓" inline). No giant save bar. |
| P1 | A **profile strength** meter in a sticky side panel: a % plus a checklist ("Add 2 projects (+8% avg match)", "Add a LinkedIn link", "Describe your last role"). Compute the gains from `score_breakdown` weights. |
| P1 | After a save that changes skills or experience: the toast says "Re-scoring your matches…", then "Your average match went up 4%" (it uses the pending → scored states agent 11 built). |
| P1 | Replace `window.confirm` with `ConfirmDialog` + `beforeunload`. |
| P2 | Skills input: typeahead from a skills taxonomy (the union of all `required_skills`), a proficiency level, "from CV" badges for extracted skills. |
| P2 | Experience and project cards: drag to reorder; dates with month pickers; a "currently here" toggle. |
| P2 | Preview pane ("See what employers see") side by side with the editor at ≥ 1280 px. |
| P3 | Import from LinkedIn (PDF export upload, parsed by the CV parser). |
