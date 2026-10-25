# New pages: SIWES coordinator and academic supervisor

These roles don't exist yet (03, 07 F-2). These are the screens they need.

## Coordinator `/dashboard/coordinator`
| Screen | Content |
|---|---|
| Session overview | The active SIWES session; eligible / placed / unplaced counts by programme; a placement deadline countdown |
| Unplaced students | A table with programme, CV ✓/✗, applications count, last activity; actions: Message · Nudge (email template) · Suggest roles (top matches) |
| At-risk placements | Students with no logbook entry for 5+ days, or weeks unsigned for 7+ days; one-click reminder to the student or supervisor |
| Supervisor assignments | Drag students onto academic supervisors; bulk assign by programme; workload per supervisor |
| Companies | Verified partners, interns hosted, response times, evaluation averages |
| Announcements | Compose to a session, programme or role; schedule; see read rates (F-10) |
| Exports | ITF placement list, logbook compliance, grades: CSV and PDF |

## Academic supervisor `/dashboard/supervisor`
| Screen | Content |
|---|---|
| My students | A card per student: company, industry supervisor, logbook compliance %, last signed week, flags |
| Weekly review | The week's entries, plus the industry supervisor's sign-off; Countersign or Comment (F-8) |
| Visit / assessment | Log a site visit or call (date, notes, rating) |
| Final grade | The evaluation form (employer rubric + report + own assessment) → grade → lock (F-9) |

Both use `DashboardShell`, `DataTable`, `StatusPill` and MFA.
