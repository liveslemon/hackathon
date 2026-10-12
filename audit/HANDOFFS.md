# Handoffs: outcomes after integration

Every handoff from the nine agent reports, checked against the merged `integration` branch.

| # | From → file | Request | Outcome |
|---|---|---|---|
| 1 | 01 → `backend/routers/cv.py` | `/refresh-cv-url` decorator was attached to `_can_view_student_cv`; the endpoint had no auth | ✅ Already fixed by 02. Decorator is on `refresh_url`, which requires `get_current_user` plus the owner/employer/admin check |
| 2 | 01 → `backend/routers/admin.py` | `/api/admin/search` unauthenticated | ❌ Invalid. It uses `Depends(verify_admin)`, both on `dev` and after merge |
| 3 | 01 → `backend/routers/analysis.py` | `/api/analysis/skill-gap` unauthenticated | ❌ Invalid. `rate_limit()` wraps `get_current_user` |
| 4 | 01 → `backend/routers/applications.py` | Cover letter endpoints unauthenticated | ❌ Invalid. `rate_limit()` wraps `get_current_user`, and the caller must match `payload.user_id` |
| 5 | 01 → `backend/routers/logbook.py` | `/api/logbook/enhance` unauthenticated | ❌ Invalid. `rate_limit()` wraps `get_current_user` |
| 6 | 01 → `backend/routers/profiles.py` | `/api/me/refresh-matches` trusts `payload.user_id` | ✅ Already fixed by 04. Uses `current_user.id` only |
| 7 | 01, 03, 04, 05, 06, 08 → `eslint.config.mjs` | Ignore Supabase edge functions | ✅ Merged once as `"supabase/functions/**"` |
| 8 | 02, 09 → `deadline-reminders/index.ts` | Lint comment above `@ts-nocheck` | ✅ Superseded by 07's typed rewrite (folder is lint-ignored anyway) |
| 9 | 03 → 06: pipeline UI | Show the `withdrawn` stage | 🔧 Fixed by the integrator. `PipelineView` has a read-only "Withdrawn" column, and employers can't advance or reject those applications |
| 10 | 03 → 05: accept offer | One active placement → 409 | ✅ Verified. DB unique index (05) plus the 409 mapping in the accept route (03) |
| 11 | 04 → 07: `lib/notifications.ts` | Respect opt-outs | ✅ Verified |
| 12 | 05 → 07: notification types | `logbook_approved` / `logbook_flagged` must be opt-out-able | 🔧 Fixed by the integrator. Added `logbook_approved: ["logbook_updates"]`; `logbook_flagged` was already mapped |
| 13 | 05 → 08: test env | Pre-populate Supabase env vars for tests | ✅ Root `tests/conftest.py` does this |
| 14 | 05 → 09: `types/untitledui-icons.d.ts` | Type declaration for icons | ✅ Kept |
| 15 | 06 → `backend/routers/applications.py` | Accept `employer_id` as well as `poster_id` in `_assert_can_manage_internship` | ✅ Already fixed by 03 |
| 16 | 06 → `Sidebar.tsx` | Add a global "Messages" nav link | ⚠️ Deferred. There is no `/messages` page yet; messaging lives inside applicant review. It needs a new page first |
| 17 | 07 → 06: post forms | Merge the duplicated admin/employer internship forms into one component | ⚠️ Deferred. A refactor, not a bug |
| 18 | 07 → 04: employer settings | Expose deadline-reminder and new-applicant email toggles | ✅ Verified. `SettingsClient` saves `email_new_applicant` / `email_deadline_reminder`, which the trigger and edge function read |
| 19 | 08 → all: RLS on stage history, audit log, templates | Inserts must set `changed_by` / `actor_id` / `employer_id = auth.uid()` | ✅ Verified in every route that inserts into these tables |
| 20 | 08 → 02: `match_results` | Use `student_id` | ❌ Handoff text wrong. The migration and all code use `user_id`, which is consistent |
| 21 | 08 → 01: `20260223000000_create_profiles.sql` | Contains Python, not SQL | ⚠️ Open. Never run this file standalone. Decide whether to delete it after checking it was never applied |
| 22 | 09 → 01: `layout.tsx` / `providers.tsx` | `suppressHydrationWarning` plus wiring `ThemeProvider` | 🔧 Fixed by the integrator. Wired with `defaultTheme="light"`, because most pages aren't dark-mode-ready |
| 23 | 09 → 08: `requirements.txt` | `numpy==2.0.2` has no prebuilt wheels for Python 3.13 on macOS ARM | ⚠️ Open. Works on 3.11 and current Render. Bump if you move to 3.13 |
| 24 | 09 → 04: `StudentPublicProfile.tsx` | `<img>` missing `alt` | ❌ Invalid. `alt` is already set |
| 25 | 09 → `DecisionTimeline.tsx` | Unescaped quotes | ⚠️ Lint warning only |

## Found during integration (not in any report)

| Issue | Fix |
|---|---|
| Admin suspend/reinstate/verify/unverify/internship-status called `.maybeSingle()` (the JS client's name). It doesn't exist in supabase-py, so all five endpoints would crash in production. Tests passed because `MagicMock` accepts any attribute | 🔧 Switched to `.maybe_single()`, handled `execute()` returning `None`, and added `test_backend_only_calls_query_methods_that_exist` to catch this class of bug |
| The root test conftest faked `core.security` verifiers for every test, which broke 01's real-JWT tests | 🔧 Added a `real_auth` marker to opt out |
| `company_assets` storage let any logged-in user upload anything to a public bucket | 🔧 `20261013100000_10_integration_fixes.sql`: employers only, file name must start with their user ID |
| Either chat participant could rewrite any message (UPDATE policies only check participation) | 🔧 Same migration: trigger allows only `is_read` to change, and not by the sender |
| `next.config.ts` rewrites `/api/cv/:name` → `/api/redirect-cv`, which doesn't exist | ⚠️ Present before the agents ran (`dev`). Real routes like `/api/cv/upload` still match first. Remove it when convenient |
| `profiles_read_scoped` lets any logged-in user read every employer profile row | ⚠️ Intentional for public company pages, but it exposes all employer columns (e.g. email). Consider a view with only public fields |
