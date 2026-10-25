# Admin: post on behalf `/dashboard/admin?tab=post`

**File:** `admin/post/PostInternshipView.tsx` (304 lines)  **Seen:** ✅ light and dark

## Today
"Post New Internship": Company Name (free text), Role Title, Field, Category, Description, Requirements, Related Interests
(chips, at least one), Application Deadline, LinkedIn URL, "Publish Internship Post". It **inserts directly** into
`internships`: no validation, no matching, not linked to any employer account (P1-3).

## Replace with
- The shared `InternshipForm` (employer/post-internship.md) plus an **"On behalf of"** company picker (search the verified
  companies; "Create a company placeholder" for partners not yet on the platform, which the company can claim later by
  invite).
- The posting is owned by the company, with `created_by = admin` recorded for audit.
- It goes through `/api/internships/post`, so validation, rescoring and notifications all apply.

## Acceptance
- An admin-posted role shows up with match scores for every student within a minute of publishing.
