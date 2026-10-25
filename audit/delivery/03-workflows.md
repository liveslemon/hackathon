# 03 · Workflows: current vs recommended

A university internship and SIWES platform has **six actors**. Today the app models three.

| Actor | Today | Recommended |
|---|---|---|
| Student | ✓ `role = student` | Keep. Add matric number, programme, level, SIWES session, eligibility. |
| Employer (company) | ✓ one login = one company | Split **company** (an organisation) from **member** (a person). A company has recruiters and industry supervisors. |
| Industry supervisor | ✗ (the employer login does everything) | A member of a company who signs off logbooks for the interns assigned to them. |
| Academic supervisor (PAU lecturer) | ✗ | Sees assigned students, reviews logbooks weekly, grades the placement. |
| SIWES coordinator (PAU office) | ✗ (only "admin", which is also IT superuser) | Manages cohorts, assigns supervisors, chases unplaced students, exports ITF reports. |
| Platform admin | ✓ | Keep for IT and support only: verification, suspension, health. |

> The landing page already promises the coordinator and supervisor features. Either build the two PAU roles
> (recommended, since it's what makes this *the* PAU SIWES system rather than another job board) or remove the copy.

---

## Student workflow

| Step | Recommended | Today | Gap / action |
|---|---|---|---|
| 1. Join | Sign up with a `@pau.edu.ng` email, or accept a coordinator invite. Verify the email. | Open sign-up, any email; the email is confirmed. | **P1-5:** enforce the domain; add invite links. |
| 2. Onboard | Role → account → programme/level/matric no. → interests → **upload CV, which pre-fills the profile** | 5 steps; CV is a separate page later. | Put the CV upload in onboarding; parse it and pre-fill skills and experience for the student to confirm. |
| 3. Profile | Profile completeness meter; skills, projects, experience, links | ✓ rich profile (1,770-line page) | Add a completeness % and "what improves your matches" hints. Split the page (see ui/student/profile.md). |
| 4. Discover | Ranked by match; filters; saved searches with alerts; "new matches" digest | ✓ grid + filters + match %; saved/liked exist | Add **saved searches and alerts**, a weekly email digest, and "closing soon". |
| 5. Apply | One click with profile; optional AI cover letter; employer screening questions; confirmation | ✓ cover letter (streaming) + submit | Add screening questions per posting, an application preview, and an "application received" email. |
| 6. Track | Timeline per application: submitted → reviewed → interview → offer | ✓ `/my-internships`, stage chips | Show *why* and *what's next* at each stage. Add withdraw (exists in the API). Show interview details. |
| 7. Interview | Pick a slot from the employer's availability; calendar invite (.ics); reminder | ✗ | **New:** interview scheduling (07 F-3). |
| 8. Offer | Offer letter with start/end dates and an acceptance deadline; accept or decline | ⚠ the accept route exists, but no offer document or deadline | **New:** offers (07 F-4). Accepting auto-withdraws other open applications (exists in the DB trigger). |
| 9. Placement start | Acceptance letter / SCAF generated; industry and academic supervisors assigned | ⚠ a placement is created on accept | Generate documents; assign supervisors. |
| 10. Logbook | Daily entries → **weekly** industry supervisor sign-off → academic supervisor review; reminders when days are missed | ✓ daily entries, AI enhance, employer approval, print | Add a weekly sign-off view, missed-day reminders, and an academic supervisor layer. |
| 11. Completion | Employer evaluation form; student final report; academic grade; certificate/export | ⚠ "Mark internship complete" + print | Add an evaluation form, report upload, grade and certificate PDF. |

## Employer workflow

| Step | Recommended | Today | Gap / action |
|---|---|---|---|
| 1. Join | Sign up with a company email; company details (CAC RC no., website) | ✓ sign-up + company fields in onboarding | Capture the CAC number; check the email domain matches the website. |
| 2. Verification | Admin approves within 48 h; publishing blocked until then | ✗ the flag exists but isn't enforced | **P1-4.** |
| 3. Team | Invite recruiters and industry supervisors | ✗ | **New:** `companies` + `company_members` (07 F-1). |
| 4. Post | Template → draft → preview as student → publish; slots; deadline; screening questions | ✓ form, templates, drafts. **Three** separate forms. | One form component (04 R-5). Add a live preview (exists in the redesign) and screening questions. |
| 5. Candidates | Ranked by live match; filters; talent search among opted-in students | ✓ ranked list, live match, pipeline | Add talent search (students opt in), saved filters, and bulk actions (bulk move, bulk reject with template). |
| 6. Pipeline | review → shortlist → interview → offer; templates for each email | ✓ stages, emails, audit trail | Interview scheduling and offer documents (as above). Add rejection reason codes. |
| 7. Communicate | An inbox per candidate; templates; read receipts | ✓ threads (from applicant review only) | **P1-9:** a `/messages` inbox, unread badge, templates. |
| 8. Placement | Assign an industry supervisor; start date; onboarding checklist | ⚠ placement created on student accept | Assign a supervisor; send a start-date reminder. |
| 9. Logbook | Weekly sign-off queue; bulk approve; comments | ✓ review queue, bulk approve, revision requests | Group by week; add a "sign week" action; remind supervisors about overdue reviews. |
| 10. Close-out | Evaluation form per intern; reports | ✓ SIWES reports + CSV | Add the evaluation form, which feeds the student's grade. |

## Admin / coordinator workflow

| Need | Today | Action |
|---|---|---|
| Know who's placed and who isn't | Overview counts only | A coordinator dashboard: eligible vs placed vs unplaced students by programme, at-risk students (no logbook entries in 5 days), pending reviews. |
| Manage SIWES sessions | ✗ | `siwes_sessions` table (e.g. "2026/27 SIWES"); import the eligible-student list (CSV). |
| Verify employers | ✓ button, but no queue, no evidence, no effect | A verification queue with evidence; enforcement (P1-4). |
| Moderate postings | ✗ | Optional "requires approval" for unverified employers; a report-a-posting flag. |
| Assign supervisors | ✗ | Bulk-assign academic supervisors to students. |
| Communicate | ✗ | Announcements to cohorts or roles (in-app + email). |
| Support | ✗ | View-as-user (read-only, audited); resend invite; reset password. |
| Platform health | API only (`llm-health` has no UI) | A health panel: queue depth, failed jobs, LLM provider status, last backfill. |
| Post on behalf of a company | ⚠ a separate form; free-text company; skips validation and matching (P1-3) | Use the employer form with an `on_behalf_of` picker. |

---

## Application state machine

Replace `status` + `stage` + `placement_status` with **one** column and **one** transition function.

```
                    ┌──────────── withdrawn (student, any time before offer accepted)
                    │
 submitted ──► under_review ──► shortlisted ──► interview ──► offered ──► offer_accepted ──► placement_active ──► completed
     │              │                │              │            │              │
     └──────────────┴────────────────┴──────────────┴──► rejected│              └──► (other open applications auto-withdrawn)
                                                                 ├──► offer_declined (student)
                                                                 └──► offer_expired  (system, after deadline)
```

| Transition | Who | Side effects |
|---|---|---|
| → `submitted` | student | Snapshot the match score; notify the employer |
| `submitted` → `under_review` / `shortlisted` / `interview` / `rejected` | employer | Notify the student; email per template |
| `interview` → `offered` | employer | Offer document, deadline (default 7 days) |
| `offered` → `offer_accepted` / `offer_declined` | **student only** | On accept: create the placement, withdraw other applications, notify everyone |
| `offered` → `offer_expired` | system (cron) | Notify both |
| `offer_accepted` → `placement_active` | system on the start date, or employer | Unlock the logbook; assign supervisors |
| `placement_active` → `completed` | employer + academic supervisor sign-off | Lock the logbook; trigger evaluation |
| any non-final → `withdrawn` | student | Notify the employer |

Implement it as `transition_application(app_id uuid, to_state text, reason text)`, a `SECURITY DEFINER` function that
checks `auth.uid()` against the allowed actor for that transition. It writes `application_stage_history` and returns the new
row. Route handlers call only this. RLS forbids direct `UPDATE` of the state column.

## Notification matrix (who hears what)

| Event | Student | Employer | Supervisor(s) | Channel |
|---|---|---|---|---|
| New match ≥ 75% | ✓ (max 3/day) | | | in-app, weekly digest |
| Application submitted | ✓ receipt | ✓ | | in-app + email |
| Stage change | ✓ | | | in-app + email |
| Interview booked / changed | ✓ | ✓ | | email + .ics |
| Offer made / expiring in 48 h | ✓ | | | email + in-app |
| Offer accepted | | ✓ | ✓ assigned | email |
| Logbook day missed (×2) | ✓ | | academic | in-app + email |
| Week awaiting sign-off > 3 days | | ✓ industry supervisor | | email |
| Posting deadline in 3 days | saved-by students | ✓ | | exists (`deadline-reminders`) |
| New message | ✓/✓ | ✓/✓ | | in-app, email if unread after 15 min |

All of these should respect `profiles.settings.notifications`. Each email needs a one-click unsubscribe per category, which
is NDPA-friendly.
