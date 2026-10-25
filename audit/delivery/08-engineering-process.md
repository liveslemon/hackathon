# 08 · Engineering process: environments, CI/CD, testing, monitoring

## Environments

| Env | Frontend | Backend | Database | Purpose |
|---|---|---|---|---|
| Local | `npm run dev` | uvicorn | Supabase local (`supabase start`, needs Docker) or the staging project | Development |
| **Staging (new)** | Vercel preview for `dev` | Render service `pau-interconnect-backend-staging` | **Second Supabase project** | Test migrations, backfills and releases on real-shaped data |
| Production | Vercel production (`main`) | Render production | Supabase `rvbheqkxighnibpfroya` | Users |

Today there's no staging. The last two migration rounds were first applied to production. One failed partway (the
`match_internships` return type), and the backfill ran against the wrong backend version (P0-5).

## Branching and release

- `main` = production. `dev` = staging. Feature branches → PR into `dev` → PR into `main`.
- Protect `main`: require CI to pass and one review (even a self-review checklist).
- **Release checklist** (`docs/RELEASE.md`):
  1. `supabase db push --linked --dry-run` against **staging**, then apply to staging.
  2. Deploy the staging backend and worker, then the frontend. Smoke test.
  3. Apply the migration to **production** (backward compatible only).
  4. Deploy the production worker, then the backend, then the frontend.
  5. Run any backfill **after** the new worker is live.
  6. Tag the release (`v1.4.0`), and write release notes from the PR titles.
- Push often. 39 local commits is a lot of unshipped risk.

## CI (current → target)

| Check | Today | Target |
|---|---|---|
| Lint, typecheck, Vitest, build | ✅ | keep |
| Backend pytest | ✅ | keep; split `requirements-dev.txt` |
| Playwright e2e | ✗ | Run against the Vercel preview URL with a **staging** Supabase seeded by script. Smoke subset on every PR; full suite nightly. |
| Visual regression | specs exist, not run | Playwright screenshots on the preview, compared to the last `main` (Argos, Chromatic, or a stored baseline) |
| Accessibility | `contrast.spec.ts` (mostly tested the login page; see the earlier audit) | axe on the top 10 routes **with a real seeded session** |
| RLS tests | ✗ | `supabase test db` with pgTAP (06) |
| Dependency audit | ✗ | `npm audit`, `pip-audit` |
| Migration lint | ✗ | Fail if a migration name isn't 14-digit unique, or an existing migration file changed |
| Duplicate workflow file | `frontend/.github/workflows/ci.yml` | delete (04 R-14) |

## Testing gaps that matter

1. **Mocks hide production bugs.** This happened twice: `.maybeSingle()` in Python, and `profiles.skills` being `jsonb` not
   `text[]`. Add an **integration test job** that runs the FastAPI tests against the staging Supabase (or local Supabase in CI
   with Docker) for the matching RPCs, the job queue claim and the admin actions.
2. **E2E can't log in.** The proxy redirects on the server, so browser-side mocks never see a session. Seed real test users
   in staging, and log in once in a Playwright `globalSetup` (storage state per role).
3. **Contract tests** between Next and FastAPI. Generate TypeScript types from FastAPI's OpenAPI (`openapi-typescript`), and
   fail CI when the frontend calls a path that doesn't exist. That would have caught the dead endpoints and the bare
   `/admin/stats` path.

## Monitoring and alerting

| What | Tool | Alert when |
|---|---|---|
| Frontend errors | Sentry (`@sentry/nextjs`) with source maps | new issue, or > 10 events / 5 min |
| Backend errors | Sentry (`sentry-sdk[fastapi]`) | new issue |
| Uptime | Better Stack or UptimeRobot, on `/ready` (backend) and `/` (frontend) every 1 min | 2 failures in a row |
| Job queue | `/ready` returns `queue_depth` and `oldest_queued_s`; the uptime check asserts it | oldest queued > 600 s, or failed jobs in the last hour > 0 |
| Email delivery | provider webhooks → `email_log` | bounce rate > 5% |
| Product analytics | PostHog (EU cloud), with no personal data in events | weekly review: sign-up → onboarding complete → CV uploaded → first application → placement |
| Database | Supabase reports + `pg_stat_statements` | monthly review |

## Docs to keep (and only these)

- `README.md`: what it is, the architecture diagram, local setup, env vars.
- `CLAUDE.md`: migration rules (commit it).
- `docs/design-system.md` (exists).
- `docs/RELEASE.md` (new).
- `docs/RUNBOOK.md` (new): backend down, queue stuck, LLM out of credits, a data deletion request, a breach.
- `audit/delivery/` (this folder) until it's done, then archive it.
