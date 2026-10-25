# Applicant review and pipeline `/dashboard/employer/internships/[id]`

**Files:** `page.tsx`, `ApplicantReviewClient.tsx` (~520 lines), `PipelineView.tsx`  **Seen:** code 🔎

## Today
A list/pipeline toggle; sort and filters; an applicant `Drawer`; `MessageThread` in context; live match scores (agent 11);
stage changes with email status feedback; a read-only "Withdrawn" column; an audit trail. Employers can't advance past
"offered" in the pipeline UI, **but the API still lets them set "accepted"** (P1-1).

## Improvements
| Priority | Change |
|---|---|
| P1 | Pipeline columns follow the state machine (03): New · Reviewed · Shortlisted · Interview · Offered · Hired, plus collapsed Rejected and Withdrawn. **Drag and drop** between allowed columns (with keyboard alternatives); disallowed moves are visibly blocked. |
| P1 | **Bulk actions** in list view: select → Shortlist / Reject with a template / Message. Rejection opens a reason picker + an email preview. |
| P1 | The drawer is the full candidate workspace: match ring + explainer, CV (inline viewer), profile summary, screening answers (F-7), timeline, private notes (`internal_notes` exists), the message thread, and the next-stage button. Deep link `?applicant=<id>`. |
| P1 | Keyboard triage: `J`/`K` next/previous candidate, `S` shortlist, `R` reject, `M` message. Show a hint bar. |
| P2 | "Schedule interview" from the Interview stage (F-3); "Make offer" from Offered (F-4). |
| P2 | Saved filters ("≥ 70% match, Computer Science, available from June"). |
| P2 | Blind review toggle (hide name and photo until shortlisted), a fairness feature universities like. |
| P3 | "Compare" two or three candidates side by side. |

## Acceptance
- An employer can triage 20 applicants without leaving the page or touching the mouse.
- No path, UI or API, lets an employer mark a candidate "accepted".
