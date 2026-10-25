# 02 · Launch blockers (P0) and must-fix (P1)

Each item lists: what's wrong, the evidence, the fix, and how to check it's done.

---

## P0 — fix before real users

### P0-1 · The backend sleeps, so first requests time out ✅
- **Evidence.** On 25 Oct the first `/api/admin/stats` call took **74 s**; the next nine calls took 0.3–0.4 s. The keep-alive
  workflow is scheduled every 14 min, but GitHub has run it only every 2–4 h (Actions history). Render's free tier sleeps
  after 15 min idle.
- **Effect.** The browser client waits 15 s, retries once, and gives up at ~31 s (`lib/api.ts`). That's the "Failed to fetch
  directory: Request timed out" you saw. Server components wait 15 s inside a `Suspense` skeleton, which can outlast the
  Vercel function limit ❓ and leave the skeleton on screen.
- **Fix.**
  1. Move to Render **Starter** (always on), or a host that doesn't sleep: Fly.io, Railway, or a small VM.
  2. Set `region: frankfurt` in `render.yaml`, next to Supabase eu-west-1 and Vercel dub1.
  3. Delete the keep-alive workflow; use an uptime monitor on `/ready` instead (see 08).
- **Done when.** `/api/admin/stats` responds in under 1 s at 08:00 after an idle night, five days running.

### P0-2 · Admin identity has four sources that disagree ✅
| Source | Where | Used by |
|---|---|---|
| `profiles.is_admin = true` | DB | frontend proxy, backend |
| `profiles.role = 'admin'` | DB | frontend proxy, backend |
| `ADMIN_EMAILS` env var | Render | **backend only** |
| `ALLOWED_ADMINS = ["hillary.ilona@pau.edu.ng"]` | `app/admin/page.tsx` | a client-side check (not security) |

- **Evidence.** `admin2@pau.edu.ng` has `role = 'student'` and `is_admin = false`, yet the backend serves it admin data
  (`/api/admin/stats` returned 200), so it must be in `ADMIN_EMAILS`. The frontend treats it as a student.
- **Fix.**
  - Keep only `profiles.role = 'admin'`.
  - Migrate: set `role = 'admin'` wherever `is_admin` is true, then drop `is_admin` (or keep it as a generated column for
    compatibility).
  - Remove `ADMIN_EMAILS` from code and Render.
  - Delete `/admin` (keep `/login/admin`).
  - Protect the `role` column with the existing `protect_profile_privileges` trigger. Only the service role may change it.
- **Done when.** `grep -rn "ADMIN_EMAILS\|ALLOWED_ADMINS\|is_admin" app lib backend/core` returns nothing, and an admin
  is an admin on every screen.

### P0-3 · Weak, published passwords on admin accounts ✅
- `admin2@pau.edu.ng` logs in with `password`. `create_test_accounts.py` publishes `Password123!` for admin, employer and
  student test accounts.
- **Fix.**
  - Rotate both admin passwords now, and delete unused test accounts from production.
  - Make the scripts read passwords from environment variables, and refuse to run against production unless a
    `--i-know-this-is-prod` flag is passed.
  - In Supabase Auth, enable leaked-password protection and a minimum password length of 10 or more.
  - Require MFA (TOTP) for admins. Supabase supports it.
- **Done when.** No credentials appear anywhere in git history going forward, and admin login asks for a TOTP code.

### P0-4 · Suspension does nothing ✅🔎
- `is_suspended` is set by the admin UI but read **nowhere**: not the proxy, `get_current_user`, RLS or the auth hooks.
- **Fix (pick one, ideally both).**
  - Call Supabase Admin `updateUserById(id, { ban_duration })` on suspend and lift it on reinstate. This kills sessions at the
    auth layer.
  - Add `AND NOT is_suspended` checks: a `current_user_active()` SQL function used in RLS, plus a check in
    `get_current_user`.
- **Done when.** A suspended test user is logged out within one token lifetime and can't call any API.

### P0-5 · Production is 39 commits behind, and the backfill already failed ✅
- 8 jobs failed with `Unknown job kind 'user_rescore'`, because the backfill ran against the old backend.
- **Fix order.**
  1. Deploy the backend from `dev`.
  2. Deploy the frontend.
  3. Run `python backfill_match_scores.py --dry-run`, then the real run.
  4. Delete the 8 failed rows.
- **Rule going forward.** Deploy job consumers before producers. New job kinds must be live in the worker before anything
  enqueues them.

### P0-6 · The landing page makes claims the product can't back up ✅
- "94%+ Skill Match Accuracy", "150+ Vetted Industry Partners", "48 hrs Avg. Employer Response", "100% Digital SIWES
  Compliance".
- "Officially sanctioned by Pan-Atlantic University".
- "University coordinator or supervisor? Sign in as Admin".
- The PAU Coordinator and Industry Mentor features, which don't exist.
- **Fix.** Replace them with real, live numbers (students placed, open roles, partner companies; see 07 W-3), or remove them.
  Get written sign-off from PAU before using its name or the word "official".

---

## P1 — fix before or right after launch

### P1-1 · Three overlapping application state fields 🔎
- `status` (pending/accepted/rejected), `stage` (applied → withdrawn) and `placement_status` (active/completed/withdrawn)
  are written by **two** endpoints (`[id]/status` and `[id]/stage`), each patching the others.
- Employers can set `accepted` directly. `stage` allows `interview → accepted` and `offered → accepted`, and the `status`
  route maps `accepted → stage accepted`. That skips the student's acceptance and never creates a placement, so the logbook
  stays locked.
- **Fix.** One `application_state` enum and one transition function in Postgres (`transition_application(id, to, actor)`)
  that validates who may make each move. See [03-workflows.md](03-workflows.md#application-state-machine).

### P1-2 · Business rules exist twice 🔎
- Logbook: Next route handlers write the DB directly, and FastAPI has the same 6 endpoints, which the UI doesn't use. Rules
  like "7-day backfill" and "no self-approval" live in both.
- Application status: Next `[id]/status` and FastAPI `applications/{id}/status`.
- **Fix.** Next.js + RLS owns CRUD. FastAPI owns AI and heavy jobs only. Delete the FastAPI copies. See 04.

### P1-3 · Admin-posted internships skip validation and are never matched 🔎
- `app/dashboard/admin/post/PostInternshipView.tsx` calls `from("internships").insert(...)`, with no zod, no
  `/api/internships/post` and no rescore. It uses a free-text company name, and `poster_id` is the admin.
- **Fix.** Admin posts through `/api/internships/post` with an `on_behalf_of` employer picker. Add a DB trigger (or
  outbox row) so *every* new or published internship queues `INTERNSHIP_RESCORE`, whatever path created it.

### P1-4 · Employer verification is decorative 🔎✅
- 0 of 3 employers are verified. Nothing reads `is_verified`.
- **Fix.**
  - Unverified employers can draft but not publish. Show a "Verification pending" banner.
  - The admin queue lists pending companies, with a CAC number, website and email domain check.
  - Students see a ✓ Verified badge on cards and company pages.

### P1-5 · Student sign-up isn't limited to PAU 🔎
- Anyone can register as a student. `you@pau.edu.ng` is only a placeholder.
- **Fix.** Require `@pau.edu.ng` (and any student subdomain) in a Supabase Auth hook or a `before insert` trigger on
  `profiles`. Allow exceptions through an admin invite.

### P1-6 · Pages wait too long and fail silently 🔎
- The client timeout is 15 s × 2 attempts. The server components' timeout is 15 s.
- **Fix.**
  - Use 8 s for reads and 20 s for AI.
  - Render server component data as independent `Suspense` islands, each with an error boundary and a **Retry** button.
  - Show "The server is waking up…" after 3 s instead of a bare skeleton.

### P1-7 · No error tracking or alerting ✅
- There's no Sentry, PostHog, log drain or uptime monitor.
- **Fix.** See 08: Sentry for Next.js and FastAPI, Better Stack or UptimeRobot on `/ready`, and an alert when the job queue
  has `failed > 0` or `queued` older than 10 min.

### P1-8 · Deadline reminders may never run ❓
- `deadline-reminders` needs a pg_cron schedule set by hand (`supabase/config.toml` says so). There's no migration for it.
- **Fix.** Add a migration with `cron.schedule('deadline-reminders', '0 8 * * *', ...)` calling the function through
  `pg_net`, with the `CRON_SECRET` header taken from Vault.

### P1-9 · Messaging has no home 🔎
- Conversations only open from applicant review. There's no `/messages` page and no nav entry for either role, so a
  student can't find a reply.
- **Fix.** Add a `/messages` inbox for both roles, with an unread badge in the sidebar (the `/api/messages/unread` route
  already exists).
