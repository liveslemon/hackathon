# 09 · Roadmap

The plan assumes one developer plus AI agents. Each phase ends with something shippable.

## Phase 0: stabilise (days 1–3)

Goal: the current product works every time.

- [ ] P0-1 Render Starter, `region: frankfurt`; delete the keep-alive workflow; uptime monitor on.
- [ ] P0-3 Rotate the admin passwords; delete the test accounts in production; remove passwords from scripts.
- [ ] P0-2 One admin source (`profiles.role`); delete `/admin`; remove `ADMIN_EMAILS`.
- [ ] P0-5 Push `dev`, PR into `main`, deploy backend then frontend; re-run the backfill; delete the 8 failed jobs.
- [ ] P0-6 Remove the false landing-page claims.
- [ ] P1-6 Shorter timeouts, plus a "waking up / retry" UI.
- [ ] P1-7 Sentry on both apps.

**Exit check:** an admin, an employer and a student each complete their main task on production at 08:00 after an idle
night, with no errors in Sentry.

## Phase 1: consolidate (week 1–2)

Goal: one place for every rule; less code.

- [ ] Staging environment (08).
- [ ] 04 R-1, R-2, R-3, R-4: one backend boundary; delete the duplicate and dead endpoints.
- [ ] 04 R-5: one `InternshipForm`; admin posts on behalf of companies (P1-3).
- [ ] P1-1: the application state machine (`transition_application`).
- [ ] P0-4: suspension enforced. P1-4: verification enforced (+ F-11 queue).
- [ ] 05: separate worker process; outbox triggers; DB-backed rate limits.
- [ ] 04 R-9 to R-15: remove dead dependencies, vendor UI folders, docs clutter, public leftovers; add a real logo.
- [ ] CI: e2e with seeded sessions on previews; RLS tests; migration lint.

**Exit check:** the line count drops by about 3k; CI covers e2e; every transition goes through one function.

## Phase 2: complete the SIWES loop (week 3–5)

Goal: PAU can run a full SIWES session on it.

- [ ] F-1 Companies and teams.
- [ ] F-2 Academic supervisor and coordinator roles, SIWES sessions, assignments.
- [ ] F-8 Weekly logbook sign-off; F-9 evaluation, completion and certificate.
- [ ] F-5 Messages inbox; F-10 announcements; F-13 privacy and terms.
- [ ] P1-5 PAU email domain for students; P1-8 cron for reminders.

**Exit check:** a pilot cohort of 10 students and 3 companies, with an academic supervisor, completes 2 weeks of logbook
with sign-offs.

## Phase 3: hiring excellence (week 6–8)

- [ ] F-3 Interview scheduling, F-4 offers, F-7 screening questions.
- [ ] F-6 Saved searches and alerts; W-6 employer Monday digest.
- [ ] W-1 Next-step coach, W-2 CV → profile, W-4 match explainer, W-3 live counters.
- [ ] F-12 Support tools, F-14 health panel.

## Phase 4: delight and scale (week 9+)

- [ ] W-5, W-7, W-8, W-9, W-10, W-11, W-12.
- [ ] F-15 Accessibility audit and statement.
- [ ] Performance: PF-1 to PF-8 with measured before/after.

## KPIs to track from day one

| KPI | Definition | Target for the first session |
|---|---|---|
| Activation | students who complete onboarding **and** upload a CV, ÷ sign-ups | ≥ 70% |
| Match coverage | scored pairs ÷ (students with a CV × open internships) | 100% (today 49%) |
| Time to first application | median sign-up → first application | < 3 days |
| Placement rate | eligible students with an active placement by the session start | ≥ 85% |
| Employer response time | median submitted → first stage change | < 5 days |
| Logbook compliance | placement days with an entry ÷ placement days | ≥ 90% |
| Weekly sign-off lag | median week end → supervisor sign-off | < 3 days |
| Reliability | uptime of `/ready`; p95 API latency | 99.5%; < 300 ms |
