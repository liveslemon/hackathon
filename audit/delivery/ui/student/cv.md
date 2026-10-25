# CV and skill gap `/dashboard/student/cv` (and `/dashboard/student/skills` → redirect)

**Files:** `page.tsx`, `CvDashboardClient.tsx`, `SkillGapClient.tsx` (1,417 lines)  **Seen:** ✅ light and dark (empty state)

## Today
"CV & Career Analysis" with an ALL-CAPS subtitle. An "Upload your CV" card with a dashed drop zone ("Click to upload or
drag and drop · PDF only, up to 5MB"). The Skill Gap Analysis section: a role search box + "Run Diagnostics" (disabled). A
completion popup after analysis ("CV Analysis Complete!").

## Problems
1. The drop zone uses the Untitled UI `FileUpload`, whose ~90 classes don't exist in your token system (04 R-10). The border
   is a heavy dark outline in both themes, not the dashed brand style.
2. After upload, the page is a long single column of results; ATS score, extracted skills and recommendations compete.
3. "Run Diagnostics" is jargon.

## Redesign
| Priority | Change |
|---|---|
| P1 | Rebuild `FileUpload` on `components/ui` (dashed `border-border-strong`, `bg-surface-sunken` on drag-over, file-type icon, progress bar, cancel). |
| P1 | Analysis progress as named stages ("Reading your CV → Extracting skills → Scoring 25 open roles"), driven by the job status, not a spinner. |
| P1 | Results in **tabs**: Overview (ATS score with what it means + top 3 fixes) · Skills (extracted, editable chips that sync to the profile) · Matches (top roles with match %) · History (previous uploads). |
| P1 | Skill gap: "Compare my CV to a role" → pick from your top matches or search → result shows have/missing skills and **a learning link per missing skill** (curated: freeCodeCamp, Coursera, YouTube). |
| P2 | "Download improved CV summary" (the LLM rewrites bullet points; the student copies them). |
| P2 | Sentence-case subtitles (G-7). |
| P3 | A before/after match delta after re-upload: "Your average match went from 54% → 67%." |
