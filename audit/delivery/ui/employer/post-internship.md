# Post and edit an internship `/dashboard/post`, `/dashboard/employer/internships/[id]/edit`

**Files:** `app/dashboard/post/PostInternshipView.tsx` (730 lines), `.../[id]/edit/EditClient.tsx`, plus the copies in
`EmployerClient.tsx` and the admin `PostInternshipView.tsx` (04 R-5)  **Seen:** ✅ admin variant (light and dark);
employer variant from code 🔎

## Today (employer form)
Sections: Role Identity & Track · Location & Compensation · Role Description & Requirements · Matching Keywords & Interests
· Application Timeline & Routing. Saved Templates; Save Current Form as Template; a live preview. The edit page is a
separate, smaller form. The admin form has a free-text Company Name, no location/stipend/duration fields, and inserts
directly into the database.

## Redesign: one `InternshipForm`
| Priority | Change |
|---|---|
| P1 | One component for create, edit and admin-on-behalf (an `onBehalfOf` company picker shown only to admins). |
| P1 | A **stepper** (Basics → Details → Requirements → Screening → Review & publish) with a sticky **live student preview** on the right (≥ 1280 px) or a "Preview" tab on mobile. |
| P1 | Inline zod errors on blur; "Save draft" always available; "Publish" disabled with a reason ("Verification pending", P1-4). |
| P1 | Required skills as a typeahead chip input (the shared skills taxonomy), because they drive matching. Show "Students with these skills: 23" as you type (a count from profiles). |
| P2 | Screening questions builder (F-7). |
| P2 | Templates in a side sheet: "Start from template", "Start from a previous posting" (duplicate). |
| P2 | AI assist: "Write a description from 3 bullet points" (cheap LLM call, editable). |
| P3 | A quality score for the posting ("Add stipend +", "Clarify duration +"), shown as a checklist. |
