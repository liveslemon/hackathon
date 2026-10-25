# PAU InterConnect: delivery audit (October 2026)

This audit treats InterConnect as a product going into real use at Pan-Atlantic University, not as a hackathon entry. It covers
the whole app: student, employer and admin, plus the backend, database, hosting and the UI of every page.

**How it was done (25 Oct 2026).** Read the code on `dev` (`eb92ff2`). Compared it with what production runs (`main`,
`c001450`). Ran read-only queries against the production database and API. Timed the live backend. Rendered every page that
dev mock mode can show, in light and dark. Each finding below says what it's based on: ✅ verified (seen or measured),
🔎 read in code, or ❓ needs checking in a dashboard I can't access.

## Where things stand

| Area | Grade | One-line verdict |
|---|---|---|
| Core features | B | Student, employer and admin flows exist end to end. The application state model and the SIWES side are the weak spots. |
| Reliability | **D** | The backend sleeps on Render's free tier. First requests take 30–75 s, and the frontend gives up after ~31 s. This is what you hit on the admin page. |
| Performance | C | Fine once warm (0.3–0.5 s per API call). The backend region is probably far from users and the database. Some pages load whole tables. |
| Security | C+ | Row-level security is solid after the audits. Admin identity is decided in four places, and test accounts use weak, published passwords. |
| Code health | C | Large duplications: logbook and application logic twice, three internship forms, two admin logins, ~15 dead endpoints, every endpoint registered twice. |
| UI | B | A real design system now exists and dark mode works. Several pages are still very large, and some popups use browser `confirm()`. |
| Delivery process | C− | CI runs lint, typecheck, unit tests and build. There's no staging environment, no error tracking, no uptime alerts, and 39 commits sit unshipped on `dev`. |

## The 12 things to do first

Fix these before inviting real users. Details and evidence are in [02-launch-blockers.md](02-launch-blockers.md).

| # | Do this | Why | Effort |
|---|---|---|---|
| 1 | Move the backend off Render's free tier, or onto a host that doesn't sleep. Put it in Europe, next to Supabase (eu-west-1) and Vercel (dub1). | Cold starts break the admin page and every AI feature. | S + ~$7–25/mo |
| 2 | Ship `dev` to production, then re-run the match backfill. | Production lacks the matching redesign, the UI overhaul and 6 fixes. 8 backfill jobs already failed because they ran against the old backend. | S |
| 3 | Make the database the single source of admin identity. Delete `/admin`, `ALLOWED_ADMINS` and the `ADMIN_EMAILS` shortcut. | `admin2@pau.edu.ng` is an admin to the backend and a student to the frontend. | S |
| 4 | Change every test-account password, and remove the hard-coded ones from the repo. | `admin2` uses the password `password`, and `create_test_accounts.py` publishes `Password123!`. | S |
| 5 | Fail fast and visibly. Server components wait up to 15 s for the backend, which may exceed Vercel's function time limit. Client calls wait ~31 s before showing anything. | Slow pages look frozen ("stuck on loading") instead of offering a retry. | S |
| 6 | Replace the three application state fields (`status`, `stage`, `placement_status`) with one state machine, and stop employers marking candidates "accepted". | Employers can skip the student's acceptance, which leaves the logbook without a placement. | M |
| 7 | Pick one home for each piece of business logic, and delete the other copy (logbook, application status, metrics). | Two copies of the rules drift apart. | M |
| 8 | Make employer verification mean something: gate publishing on it, and show a badge to students. | All 3 employers are unverified, and nothing checks the flag. | S–M |
| 9 | Route admin-posted internships through the same API as employers. | They skip validation and never get match scores. | S |
| 10 | Add error tracking (Sentry) and uptime alerts. | Today you find out about failures from users. | S |
| 11 | Remove the landing-page claims that aren't true ("94%+ accuracy", "150+ partners", "officially sanctioned", the coordinator features). | It's a trust and possibly a legal problem. | S |
| 12 | Add a staging environment: a second Supabase project plus Vercel preview plus a backend preview. | Migrations and backfills are tested on production today. | M |

## Reading order

| File | What's in it |
|---|---|
| [01-state-of-the-app.md](01-state-of-the-app.md) | Inventory: pages, endpoints, tables, hosting, production numbers |
| [02-launch-blockers.md](02-launch-blockers.md) | P0/P1 issues with evidence, fix and acceptance check |
| [03-workflows.md](03-workflows.md) | Current vs recommended workflow for student, employer, admin, plus the missing **academic supervisor** role |
| [04-redundancies.md](04-redundancies.md) | Everything to delete or merge, with the replacement |
| [05-architecture-performance.md](05-architecture-performance.md) | Target architecture, hosting, latency budget, job queue, caching |
| [06-security-privacy.md](06-security-privacy.md) | Access control, secrets, Nigeria Data Protection Act (NDPA) compliance |
| [07-features-and-wow.md](07-features-and-wow.md) | Feature backlog and the "wow" layer, prioritised |
| [08-engineering-process.md](08-engineering-process.md) | Environments, CI/CD, testing, migrations, releases, monitoring |
| [09-roadmap.md](09-roadmap.md) | A week-by-week plan from stabilising to launch to growth |
| [ui/](ui/README.md) | UI improvements, **one file per page**, plus shared components |

## Severity and effort used throughout

- **P0:** blocks reliable use or is a security hole. Fix before launch.
- **P1:** users will notice, or it causes data problems. Fix before or right after launch.
- **P2:** quality and efficiency. Plan it in.
- **P3:** polish and wow.
- **Effort:** S = under half a day, M = 1–3 days, L = more than 3 days.
