# 10 · Implementation plan: executing the audit with parallel agents

This plan turns every item in `audit/delivery/` into work for **21 agents in 4 waves**, plus a human track for the
dashboard tasks agents can't do and an integration step between waves. It's designed so agents in the same wave **never
edit the same file**, and so later waves build on what earlier waves merged.

The prompts are ready to paste in [`/agent-prompts-v3/`](../../agent-prompts-v3/).

## Why waves (and not 22 agents at once)

Some changes reshape things everything else depends on:

1. who an admin is, and which roles exist (wave 1)
2. the application state machine (wave 1)
3. companies replacing single employer accounts (wave 2)

If page redesigns ran at the same time, they'd be built on columns and routes that are about to change. So:

| Wave | Theme | Agents | Runs after | Rough duration |
|---|---|---|---|---|
| **0** | Human tasks + ship what's on `dev` | you + me | now | 1 day |
| **1** | Stabilise and consolidate: infra, identity, state machine, cleanup, test infra | 7 (21–27) | wave 0 | 3–5 days |
| **2** | Complete the product: companies, SIWES roles, hiring, comms, email/cron, privacy | 6 (31–36) | wave 1 merged | 5–8 days |
| **3** | UI everywhere: shared kit first, then 4 page agents | 1 + 4 (41, then 42–45) | wave 2 merged | 5–7 days |
| **4** | Wow features, accessibility, performance, final QA | 3 (51–53) | wave 3 merged | 4–6 days |

Between waves, I (Claude Code) do what I did before:
- merge the branches into `integration-N`
- run every check
- review for mock-hidden bugs and behaviour changes
- check migrations against the real production schema
- apply migrations to **staging**, then give you the production commands
- merge into `dev`, and open the PR into `main`

## How clashes are prevented

1. **File ownership per wave.** Each prompt lists the files and folders the agent may edit. Everything else is read-only.
   Needs outside that list go into a "Handoffs" section of the agent's report, which the integrator applies.
2. **Contracts written up front.** Where one agent builds something another uses (a SQL function, an env var, a column), the
   name and signature are fixed in this plan (below). Both sides code against it on day 1, so nobody waits.
3. **Migration number ranges.** Each agent gets its own 14-digit prefix: `<wave date>00<agent><seq>`. Agent 22's second
   migration in wave 1 is `20261101002202_22_<name>.sql`. Ordering inside a wave follows the agent number, so foundations
   take low numbers.
4. **Compatibility first.** Schema changes keep old columns working, through sync triggers or views, so readers in other
   agents' files don't break mid-wave. Old columns are dropped only in a later wave, by the owner.
5. **No production access for agents.** Agents never run `supabase db push`, backfills or deploys. Only the integrator
   (with you) touches staging and production.
6. **The integrator merges by agent number** within a wave, so a contract provider merges before its consumers.

## Model choice

Available in Antigravity: Claude Opus 4.6, Claude Sonnet 4.6, Gemini 3.8 Flash, Gemini 3.1 Pro (leaving soon), GPT-OSS.

| Model | Use for | Agents |
|---|---|---|
| **Claude Opus 4.6** | Security, data-model changes, anything where a subtle mistake corrupts data or leaks it | 22, 24, 31, 32 |
| **Claude Sonnet 4.6** | Substantial features and redesigns with clear specs | 21, 25, 26, 33, 34, 36, 41, 42, 43, 44, 51, 52 |
| **Gemini 3.8 Flash** (highest thinking level) | Mechanical deletions, docs, copy, well-specified pages, email templates | 23, 27, 35, 45, 53 |
| Gemini 3.1 Pro | Optional swap for any Sonnet slot while it's still listed | — |
| GPT-OSS | Not recommended for multi-file agent work | — |

Run at most 2 Opus agents at the same time (quota). Waves 1 and 2 each have exactly 2 Opus agents at a time.

---

## Wave 0: human track + ship `dev` (you, with me)

Agents can't do these. Wave 1 shouldn't start until items 1–6 are done.

| # | Task | Audit ref | Where |
|---|---|---|---|
| 1 | Commit the audit, `CLAUDE.md` and the prompts to `dev`, so worktrees can see them (in the setup script) | — | terminal |
| 2 | Render: upgrade the web service to **Starter**; create the service in **Frankfurt** (region can't be changed in place, so create a new service and point Vercel's `NEXT_PUBLIC_BACKEND_URL` at it) | P0-1 | Render |
| 3 | Rotate the `admin@pau.edu.ng` and `admin2@pau.edu.ng` passwords; delete the test student and employer accounts in production | P0-3 | Supabase Auth |
| 4 | Supabase Auth: leaked-password protection on; minimum password length 10; enable TOTP MFA | P0-3, S-4 | Supabase |
| 5 | Ship `dev` → `main` (PR), deploy backend then frontend, then the backfill; delete the 8 failed jobs | P0-5 | me + you |
| 6 | Create a **staging** Supabase project, a staging Render service and Vercel preview env vars, and give me the staging link | 08 | dashboards |
| 7 | Create Sentry projects (Next.js, FastAPI) and an uptime monitor on `/ready`; put the DSNs in env vars | P1-7 | Sentry, Better Stack |
| 8 | Check: the Vercel plan (Pro for commercial use), the Supabase plan (Pro for backups), whether pg_cron is enabled | 05 | dashboards |
| 9 | Decide: SSO provider (Google Workspace or Microsoft Entra, whichever PAU uses), email provider (Resend **or** Brevo), sender domain (+ DNS for SPF/DKIM/DMARC) | login, R-15 | you + PAU IT |
| 10 | Ask PAU for written approval of the wording on the landing page ("official", logos) | P0-6 | PAU |

---

## Wave 1: stabilise and consolidate (7 agents, in parallel)

| Agent | Model | Scope (audit IDs) |
|---|---|---|
| **21 Platform and infra** | Sonnet | P0-1 code side (`render.yaml` region + worker service), RL-1, RL-4, RL-5, PF-5, PF-6 (zero-import deps), P1-6, P1-7 (Sentry), R-14, the 06 checklist (headers, CORS, audits, the service-key CI grep), the 08 CI targets |
| **22 Identity and access** | **Opus** | P0-2, P0-3 (scripts), P0-4, S-1–S-4, S-6, S-8, S-9, P1-5, R-6 (delete `/admin`); removes "Admin Login" from public pages |
| **23 Backend dead-code removal** | Flash | R-2 (FastAPI side), R-3, R-4, the FastAPI half of R-1 |
| **24 Application state machine + DB rules** | **Opus** | P1-1, the DB-rule half of R-1 (logbook trigger), RL-9 (idempotency keys on apply/transition) |
| **25 Matching, jobs and AI service** | Sonnet | P1-3 (DB trigger half), RL-2, RL-3, RL-6, a dedicated worker entrypoint, PDF magic-byte check |
| **26 Test infrastructure** | Sonnet | 08 testing gaps 1–3: seeded staging users, Playwright `globalSetup` with real sessions, pgTAP RLS tests, OpenAPI → TS contract types, an integration test job |
| **27 Repo cleanup and docs** | Flash | R-7 (delete `/test-connection`), R-11 (old folder + unstamped files), R-12, R-13, P0-6 (landing copy only), README, RELEASE.md, RUNBOOK.md |

### Wave 1 file ownership

| Agent | Owns (may edit) |
|---|---|
| 21 | `render.yaml`, `.github/**` (root), `backend/main.py`, `backend/core/{config,db,rate_limit}.py`, `backend/routers/system.py`, `backend/requirements*.txt`, `frontend/.../{next.config.ts,vercel.json,package.json,package-lock.json,instrumentation*.ts,sentry.*.config.ts}`, `lib/{api,api-server,env,logger}.ts`, `scripts/health/**` |
| 22 | `backend/core/security.py`, `backend/routers/admin.py`, `backend/create_*.py`, `proxy.ts`, `lib/{role-guard,post-login,fast-signout,supabaseClient}.ts`, `context/AuthContext.tsx`, `app/admin/**` (delete), `app/login/**`, `app/api/auth/**`, migrations `20261101002201+` |
| 23 | `backend/routers/{applications,logbook,profiles}.py`; the bare-path fix in `app/dashboard/admin/{overview/OverviewView,analytics/AnalyticsView}.tsx` (2 lines only); tests for those routers |
| 24 | `app/api/applications/**`, `lib/placements.ts`, migrations `20261101002401+`, `tests/lib/placements*.test.ts` |
| 25 | `backend/routers/{cv,analysis}.py`, `backend/services/**`, `backend/worker.py` (new), `backend/backfill_*.py`, `app/api/internships/**`, `app/api/cv/**`, migrations `20261101002501+` |
| 26 | `playwright.config.ts`, `tests/e2e/**`, `frontend/.../supabase/tests/**` (pgTAP), `scripts/seed/**` (new), `backend/tests/integration/**`, `types/generated/**` (new) |
| 27 | `README.md`, `docs/**` (except `design-system.md`), the root `*.md` clutter, `agent-prompts-v2/`, `AGENT_PROMPTS.md`, `frontend/.../{improvements,tasks,.github,ROADMAP.md}`, `backend/{improvements,.github,VECTOR_MATCHING_EXPLAINED.md}`, `backend/supabase/**`, `frontend/.../public/**`, `app/test-connection/**`, `app/page.tsx` (**copy only**), old migration files listed in R-11 |

### Wave 1 contracts

| ID | Provider | Contract |
|---|---|---|
| K1 | 21 | Env `RUN_INLINE_WORKER` (default `true`). When `false`, `main.py` doesn't start `worker_loop`. Render gets a second service, `pau-interconnect-worker`: `python worker.py`, Frankfurt. |
| K2 | 21 | `lib/api.ts` exports `READ_TIMEOUT_MS = 8000` and `AI_TIMEOUT_MS = 20000`, and the server helper uses `READ_TIMEOUT_MS`. |
| K3 | 21 | `/ready` returns `{status, checks:{database}, queue:{queued, processing, failed_1h, oldest_queued_s}, version}`. |
| K4 | 22 | `profiles.role` check: `student, employer, admin, coordinator, academic_supervisor`. SQL helpers `public.has_role(text) → bool`, `public.current_user_active() → bool` (not suspended). `is_admin` **stays a real column**, kept equal to `(role = 'admin')` by a trigger (20 files and 6 policies read it). It's removed in wave 3 by 44, after readers move to `role`. |
| K5 | 24 | `applied_internships.state` (text, checked against the 03 state list), `public.transition_application(p_app uuid, p_to text, p_reason text default null, p_idempotency_key text default null) returns applied_internships` (SECURITY DEFINER; checks the actor). Trigger keeps `status` and `stage` derived from `state`. Direct `UPDATE` of `state`/`status`/`stage` by `authenticated` is blocked. |
| K6 | 25 | Triggers on `internships` (insert, publish, matching-field update) and `profiles` (skills/CV fields) enqueue `INTERNSHIP_RESCORE` / `USER_RESCORE` into `cv_processing_jobs` with the existing dedupe. `backend/worker.py` runs `worker_loop` standalone. |
| K7 | 26 | `scripts/seed/seed-staging.ts` creates test users: `student1@test.pau.edu.ng`, `employer1@test.dev`, `admin1@test.pau.edu.ng`, `coordinator1@…`, `supervisor1@…`, with passwords from env `SEED_PASSWORD`. Playwright storage states land in `tests/e2e/.auth/<role>.json`. |

---

## Wave 2: complete the product (6 agents, in parallel)

| Agent | Model | Scope |
|---|---|---|
| **31 Companies, teams and verification** | **Opus** | F-1, F-11 + P1-4 enforcement (publishing gated), employer onboarding company step + consent checkbox (K12), employer settings Team and Verification sections |
| **32 SIWES roles and logbook loop** | **Opus** | F-2 (sessions, enrolments, assignments), F-8 weekly sign-off, F-9 evaluation, completion and certificate (incl. W-8 verify page), coordinator and supervisor pages (functional), proxy routing for the new roles |
| **33 Hiring: interviews, offers, screening** | Sonnet | F-3, F-4, F-7 on top of K5; the student offer/interview tabs in `/my-internships`; employer schedule/offer actions in applicant review |
| **34 Communications** | Sonnet | F-5 `/messages`, the notifications page + grouping + digest settings, F-10 announcements, S-5, Sidebar nav entries for Messages, coordinator and supervisor |
| **35 Email and scheduling** | Flash | R-15 single provider + `email_log`, the new templates (shared/emails.md), pg_cron jobs (deadline reminders, offer expiry, stats refresh, retention), F-6 saved searches + alerts (API + email; the UI comes in wave 3), S-11 |
| **36 Privacy and NDPA** | Sonnet | F-13 `/privacy`, `/terms`, `/accessibility`; the consent API; `student_public_profile` view; a 30-day deletion grace period + receipt; the retention purge function |

### Wave 2 file ownership

| Agent | Owns |
|---|---|
| 31 | migrations `20261115003101+`; `app/onboarding/**`; `app/dashboard/employer/settings/**`; `app/api/internships/post/**`, `app/api/internships/[id]/status/**` (publish gate only); `backend/routers/admin.py` (verification); new `app/api/companies/**`, `app/invite/**` |
| 32 | migrations `…3201+`; `proxy.ts`, `lib/role-guard.ts`; `app/api/logbook/**`, `app/api/reports/**`; `app/dashboard/student/logbook/**` (incl. print); `app/dashboard/employer/logbook/**`; new `app/dashboard/{coordinator,supervisor}/**`, `app/verify/**`, `backend/routers/coordinator.py` |
| 33 | migrations `…3301+`; `app/api/applications/**`; new `app/api/{interviews,offers}/**`, `app/api/internships/[id]/questions/**`; `app/dashboard/employer/internships/[id]/**`; `app/my-internships/**`; `app/dashboard/post/**` (screening builder only) |
| 34 | migrations `…3401+`; `components/{Sidebar,NotificationBell,MessageThread,AnnouncementBanner}.tsx`; `lib/notifications.ts`; `app/api/messages/**`; new `app/messages/**`, `app/notifications/**`, `app/api/announcements/**`, `app/dashboard/admin/announcements/**` |
| 35 | migrations `…3501+`; `lib/{email,email-templates}.ts`, `lib/emails/{layout,platform}.ts`; `supabase/functions/**`; `backend/routers/applications.py` (email sends only); new `app/api/{saved-searches,email}/**`, `app/dev/emails/**` |
| 36 | migrations `…3601+`; `backend/routers/profiles.py`; `app/api/me/**`; `app/profile/[id]/**` (switch to the view); new `app/{privacy,terms,accessibility}/**`, `app/api/consent/**`, `lib/consent.ts` |

### Wave 2 contracts

| ID | Provider | Contract |
|---|---|---|
| K8 | 31 | Tables `companies(id, name, cac_number, website, email_domain, logo_url, banner_url, verified_at, verified_by, status)` and `company_members(company_id, user_id, member_role in ('owner','recruiter','supervisor'))`; `internships.company_id`. Functions `is_company_member(p_company uuid, p_roles text[] default null)` and `can_manage_internship(p_internship uuid)`. **`is_internship_employer()` is redefined on top of membership**, so every existing policy keeps working. Migrates each employer profile into a company with them as owner. |
| K9 | 32 | `siwes_sessions`, `session_enrollments(student_id, session_id)`, `supervisor_assignments(placement_id, academic_supervisor_id, industry_supervisor_id)`, `logbook_weeks(placement_id, week_start, industry_signed_at/by, academic_signed_at/by)`. Function `is_assigned_supervisor(p_placement uuid)`. |
| K10 | 33 | `interviews`, `interview_slots`, `offers(application_id, start_date, end_date, stipend, expires_at, letter_url, status)`. Function `expire_offers()`, which 35 schedules daily. |
| K11 | 34 | Sidebar nav config is a single exported array per role in `components/Sidebar.tsx`. 32's coordinator and supervisor items are added by 34 from this spec: Coordinator: Overview, Students, Placements, Supervisors, Companies, Announcements, Exports. Supervisor: My students, Weekly review. |
| K12 | 36 | `lib/consent.ts` exports `CONSENT_VERSION`, and `POST /api/consent {version}` records `consent_version` and `consented_at` on the profile. 31 adds the checkbox in onboarding. |
| K14 | 32 | `proxy.ts` (32 owns it in wave 2) treats `/invite/**`, `/verify/**`, `/privacy`, `/terms`, `/accessibility` as public pages, and `GET /api/verify/**` as a public API. 31 and 36 rely on this. |
| K15 | 35 | **First commit of wave 2:** `lib/email.ts` `sendEmail({to, subject, html, text, category, replyTo?, attachments?})` → `{status, id?, reason?}`, and `lib/emails/layout.ts` `renderEmailLayout({preheader, title, bodyHtml, cta?, footerNote?, unsubscribeCategory?})` → `{html, text}`. Other agents put their templates in `lib/emails/<area>.ts`. |
| K16 | 36 | `purge_expired_data()` (accounts past the 30-day deletion grace period, plus the retention rules), scheduled weekly by 35. `lib/consent.ts` + `POST /api/consent` = K12. |
| K13 | 35 | `platform_stats` materialized view (students placed, open roles, verified companies, logbook days signed), refreshed hourly. 45 reads it in wave 3. |

---

## Wave 3: UI everywhere (41 first, then 42–45 in parallel)

Each agent implements the matching files in [`ui/`](ui/README.md) literally, plus the global items G-1 to G-12 for its pages.

| Agent | Model | Pages | Also |
|---|---|---|---|
| **41 Shared shell and kit** (runs first, ~1–2 days) | Sonnet | `ui/shared/*`, G-1, G-2, G-5 (kit side), G-6, G-9, G-12 | Redesigned internship card, MatchScore explainer (W-4), ⌘K palette (W-9), `FileUpload` on the kit (R-10, then delete the vendor folders), replace `react-icons` with lucide, bottom tab bar, logo |
| **42 Student pages** | Sonnet | all of `ui/student/*` | W-1 coach, PF-1 `student_feed` RPC, PF-3/PF-4, saved-search UI on top of 35's API |
| **43 Employer pages** | Sonnet | all of `ui/employer/*` | R-5 one `InternshipForm` (also used by admin post on behalf, P1-3 UI half), PF-7 |
| **44 Admin, coordinator and supervisor UI** | Sonnet | `ui/admin/*` | Admin into `DashboardShell` with real routes (R-8, G-10), F-12 support tools, F-14 health panel, PF-2 `admin_kpis()`, W-11 heatmap, a polish pass on 32's pages |
| **45 Public, auth and email visuals** | Flash | `ui/public/*`, the visual side of `ui/shared/emails.md` | One `/login` + SSO button (provider chosen in wave 0), W-3 live counters, PF-3 static/ISR, OpenGraph, sitemap |

Ownership: 41 owns `components/**` (except `components/internships/**`, which is 43's) and `app/globals.css`. 42–45 own
their `app/**` areas as listed in their prompts. Only 44 may edit `backend/routers/admin.py`. 42 may add SQL migrations
`20261201004201+`, 43 `…4301+`, 44 `…4401+`, 45 `…4501+`.

---

## Wave 4: wow, accessibility, performance and final QA (3 agents)

| Agent | Model | Scope |
|---|---|---|
| **51 Student wow** | Sonnet | W-2 CV → profile in onboarding, W-7 voice logbook, W-10 PWA + offline logbook drafts, W-12 interview prep pack |
| **52 QA, accessibility and performance** | Sonnet | F-15 WCAG 2.2 AA pass on the top 10 pages with real sessions; axe + visual baselines in CI; PF-8 slow-query review; Lighthouse budgets; a full e2e run per role; the final `COVERAGE.md` of every audit item |
| **53 Employer and platform wow** | Flash | W-5 one-tap apply pitch, W-6 employer Monday digest, the announcement email polish |

52 owns only tests, CI config (handed over from 21) and an `a11y/` fixes branch. Fixes outside tests go into its report as
handoffs, which I apply, so it can't conflict with 51 and 53.

---

## Integration checklist (after every wave, by me)

1. Every branch has its report, a clean tree and passing checks.
2. Merge by agent number into `integration-N`; resolve conflicts; run lint, typecheck, Vitest, pytest, build and the e2e
   smoke tests.
3. Review the diffs for:
   - mock-only methods
   - wrong column types against the real schema
   - behaviour changes in UI waves
   - non-existent token classes
   - unauthenticated routes
   - `SECURITY DEFINER` functions without `search_path` and actor checks
   - public execute grants on sensitive functions
4. `supabase db push --dry-run` against **staging**; apply; run the staging e2e; then give you the production commands.
5. Deploy order: migrations, then the worker, then the backend, then the frontend, then backfills (RL-10).
6. Update `COVERAGE.md`: every audit ID is ✅ done, ⚠️ partial or ⏭ deferred, with the commit.

## Timeline at a glance

```
Week:    1           2           3           4           5           6
W0  ███
W1     █████
W2              ████████
W3                        ██ ███████
W4                                    ██████
Int.       ▲          ▲          ▲            ▲  (2–4 h each)
```

About 5–6 weeks to work through the whole audit, with a pilot-ready product (P0s and P1s fixed, SIWES loop complete) at the
end of wave 2, around week 3.
