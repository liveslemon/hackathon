# Student public profile `/profile/[id]` (what employers see)

**Files:** `page.tsx`, `StudentPublicProfile.tsx` (636 lines)  **Seen:** code 🔎. Access is scoped by `employer_can_view_student`.

## Improvements
| Priority | Change |
|---|---|
| P1 | Respect the privacy settings visibly: hidden fields show nothing, not an empty label. Show the student a "This is what GreenStack sees" preview from their own profile page. |
| P1 | For employers, lead with **fit for this role**: when opened from an application, show the match ring + matched/missing skills for that internship at the top. |
| P1 | CV button opens the viewer (`/cv/view`) in a drawer, not a new page; record "CV viewed" for the student (a transparency notification, if you choose to). |
| P2 | Layout: header card (avatar, name, programme, level, links) → About → Skills (grouped) → Experience → Projects (with links and images) → Certifications. |
| P2 | Employer actions in the header: Shortlist · Message · Download CV, when opened from a pipeline. |
| P3 | A printable one-page "candidate summary" for employers who print shortlists. |
