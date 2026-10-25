# UI improvements

There's one file per page, grouped by role. [shared/](shared/) covers the pieces every page uses.

**How these were made.** Every page that dev mock mode renders was screenshotted at 1440 px in light and dark: the public
pages, the student dashboard, CV, company, the employer dashboard and the admin tabs. Pages that mock mode can't render
(they redirect to login: logbook, my internships, profile, settings, most employer sub-pages) were reviewed from code. Each
file says which.

## What every page should get (apply once, globally)

| # | Change | Where |
|---|---|---|
| G-1 | **Labelled navigation.** The sidebar is icon-only with no visible labels; the labels only exist in code. Use labels by default on ≥ 1024 px, collapsible to icons, with tooltips when collapsed. | [shared/app-shell.md](shared/app-shell.md) |
| G-2 | **A real logo** (SVG, light + dark). The sidebar shows a blank tile (it loads `/favicon.ico` through `next/image`). | shared/app-shell |
| G-3 | **One page template.** `PageHeader` (title, one-line description, primary action) → optional KPI row → content. Only 14 of 35 pages use `PageHeader`. | all pages |
| G-4 | **States everywhere.** Loading skeletons that match the layout; empty states with a next action; inline errors with **Retry**; "server waking up" after 3 s. Only the main dashboards, internship detail, logbook and landing have both `loading.tsx` and `error.tsx`; every employer sub-page, the CV page, settings and the public profile have neither. | all pages |
| G-5 | **No browser dialogs.** Replace `window.confirm` (logbook, internship apply, profile leave-guard) with `ConfirmDialog`. | 3 pages |
| G-6 | **Use the kit you built.** `DataTable` is used nowhere outside the style guide; the admin tables and applicant lists hand-roll theirs. `Tabs`, `Drawer` and `StatCard` are underused. | admin, employer |
| G-7 | **Calmer typography.** Many sections use ALL-CAPS tracked subtitles ("UPLOAD YOUR CV TO CALCULATE…"). Keep caps for tiny labels; use sentence case for descriptions. | student CV, dashboard |
| G-8 | **Split the giant files.** Admin 1,940 lines, profile 1,770, employer dashboard 1,730, CV 1,417, internship detail 1,037. Split them into section components (≤ 300 lines each) so they're testable and faster to change. | 5 pages |
| G-9 | **Mobile first for students.** Students mostly use phones. Bottom tab bar on < 768 px (Home, Internships, Logbook, Messages, Profile); sticky primary actions. | shared/app-shell |
| G-10 | **Consistent admin shell.** Admin uses its own header and tab layout, unlike student and employer. Move admin into `DashboardShell` with a sidebar, and make the tabs real routes. | admin/* |
| G-11 | **Microcopy pass.** Plain, specific language; no internal terms ("dev profile", "Synced profile" in production); success toasts that say what happened and what's next. | all pages |
| G-12 | **Motion with purpose.** Page transitions off; small 150 ms fades for popovers; skeleton shimmer; confetti once on offer accepted. Respect `prefers-reduced-motion` (the tokens support it). | shared |

## Index

**Shared:** [app-shell](shared/app-shell.md) · [notifications](shared/notifications.md) · [messaging](shared/messaging.md) ·
[modals, toasts and feedback](shared/feedback.md) · [emails](shared/emails.md) · [internship card](shared/internship-card.md)

**Public:** [landing](public/landing.md) · [login pages](public/login.md) · [password reset](public/password-reset.md) ·
[onboarding](public/onboarding.md) · [404 and errors](public/not-found-and-errors.md)

**Student:** [dashboard](student/dashboard.md) · [internship detail](student/internship-detail.md) ·
[my internships](student/my-internships.md) · [CV and skill gap](student/cv.md) · [logbook](student/logbook.md) ·
[logbook print](student/logbook-print.md) · [profile](student/profile.md) · [public profile](student/public-profile.md) ·
[settings](student/settings.md) · [company page](student/company-page.md) · [CV viewer](student/cv-viewer.md)

**Employer:** [dashboard](employer/dashboard.md) · [postings](employer/postings.md) ·
[applicant review and pipeline](employer/applicant-review.md) · [post and edit internship](employer/post-internship.md) ·
[analytics](employer/analytics.md) · [logbook review](employer/logbook-review.md) · [reports](employer/reports.md) ·
[settings](employer/settings.md)

**Admin:** [overview](admin/overview.md) · [analytics](admin/analytics.md) · [manage platform](admin/manage.md) ·
[post on behalf](admin/post.md) · [new: health panel](admin/health.md) · [new: coordinator views](admin/coordinator.md)
