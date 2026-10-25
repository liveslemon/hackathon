# 04 · Redundancies: what to delete or merge

Every item: what's duplicated, what to keep, and what to delete. Doing all of R-1 to R-8 removes roughly **3,500 lines** and
**~45 routes**, and leaves one place to change each rule.

## Principle for the backend boundary

| Layer | Owns | Doesn't own |
|---|---|---|
| **Next.js route handlers + Supabase RLS** | All CRUD: profiles, internships, applications, logbook, messages, notifications, templates, reports | AI, file parsing, anything slow |
| **FastAPI** ("AI service") | CV parsing/OCR, embeddings, matching, cover letters, logbook enhance, skill gap, job queue, admin health | Plain database reads and writes |

The rules (who can approve, backfill windows, state transitions) live **once**: in Postgres (RLS + functions) where
possible, or in one TypeScript module otherwise.

---

### R-1 · Logbook implemented twice
- **Keep:** `app/api/logbook/{entry, entry/[id]/status, bulk-status, student, employer}` (the UI uses these).
- **Delete:** FastAPI `/api/logbook/entry`, `/student`, `/employer`, `/entry/{id}/status`, `/bulk-status`. Keep only `/enhance`.
- Move the rules (7-day backfill, no future dates, no self-approval, no edits after approval) into Postgres, through a
  `before insert or update` trigger on `logbook_entries`, so both paths, and any future one, obey them. Part of this already
  exists in `protect_logbook_review`.

### R-2 · Application status implemented twice
- **Keep:** the Next `/api/applications/[id]/*` routes, then replace both `status` and `stage` with `transition_application`
  (03).
- **Delete:** FastAPI `PUT /applications/{id}/status`, `POST /submit-application`, `GET /applications/student`,
  `GET /internships/{id}/applicants`. None of them is used by the UI.

### R-3 · Every FastAPI route registered twice
- `@router.post("/draft-cover-letter")` **and** `@router.post("/api/draft-cover-letter")`, 31 duplicated decorators (67 registrations for 36 endpoints).
- **Keep:** the `/api/...` forms. **Delete:** the bare ones (check the Next code and `deadline-reminders` call only `/api/`;
  `authenticatedFetchServer("/admin/stats")` must become `/api/admin/stats`).

### R-4 · Dead FastAPI endpoints
`analyze-existing-cv`, `my-matches`, `GET /api/companies/{id}`, `POST /admin/internships/{id}/status` (no UI),
`/test-supabase`, `/health-check` (`/health` and `/ready` cover it), and the `routing_service` duplicate scoring path.
Either wire `llm-health` into the admin health panel (07) or delete it.

### R-5 · Three internship posting forms
| Form | Lines | Path |
|---|---|---|
| `app/dashboard/post/PostInternshipView.tsx` | 730 | `/api/internships/post` ✓ |
| `app/dashboard/employer/EmployerClient.tsx` (modal) | 340 | `/api/internships/post` ✓ |
| `app/dashboard/admin/post/PostInternshipView.tsx` | 304 | **direct insert** ✗ |

**Keep** one `components/internships/InternshipForm.tsx` (built from the `/dashboard/post` version). It takes `mode: "create" |
"edit"` and an optional `onBehalfOf` for admins. The edit page and the modal reuse it.

### R-6 · Two admin logins
`/admin` (hard-coded `ALLOWED_ADMINS`) and `/login/admin`. **Delete `/admin`.** Redirect it to `/login/admin`.

### R-7 · Redirect-only and dev pages
| Page | What it does | Action |
|---|---|---|
| `/dashboard/student/skills` | redirects to `/dashboard/student/cv` | delete, plus a `next.config` redirect |
| `/dashboard/analytics` | redirects to `/dashboard/employer` | delete, plus a redirect |
| `/onboarding/employer` | redirects to `/onboarding?role=employer` | keep as a redirect in `next.config`; delete the page file |
| `/test-connection` | dev diagnostics | delete (Sentry and health checks cover it) |
| `/test-components` | style guide | keep, dev-only (it already is) |

### R-8 · Sidebar links to pages that don't exist
`components/Sidebar.tsx` links admins to `/dashboard/admin/manage` and `/dashboard/admin/analytics`. Neither exists (the
admin area uses `?tab=`). Either make the admin tabs real routes (recommended: real URLs, back button, per-tab loading) or
fix the links.

### R-9 · Dependencies nobody imports
- `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled` (0 imports)
- `cross-fetch` (Node 18+ has fetch)
- `react-icons` (8 files) duplicates `lucide-react` (52 files)
- `@untitledui/icons` / `file-icons` (1 file each)
- `redis` (backend, optional and unused in production)
- `pytest` and `pytest-asyncio` are in production `requirements.txt`; move them to `requirements-dev.txt`.

Expected effect: a smaller install, a faster build, and less JS shipped where tree-shaking misses.

### R-10 · Two UI kits
`components/ui/*` (yours, token-based) vs `components/base/*`, `components/foundations/*` and
`components/application/file-upload/*` (Untitled UI). The Untitled UI files use ~90 class names that **don't exist** in your
design system, so they render unstyled. Only the CV upload uses them. **Rebuild `FileUpload` on `components/ui`** and delete
the three vendor folders.

### R-11 · Two migration folders and messy history
- `backend/supabase/migrations/` (4 old files) vs `frontend/pau-interconnect-app/supabase/migrations/` (canonical per
  CLAUDE.md). **Delete the backend folder** once confirmed applied (the one remote version is already copied over).
- `20260223000000_create_profiles.sql` contains Python, not SQL. It's marked applied; replace its body with a comment
  explaining that.
- `20260801020000_consolidated_migrations.sql` and `...030000_consolidated_migrations_fixed.sql` duplicate earlier files.
- `add_company_banner_url.sql` and `create_logbook_table.sql` have no timestamp, so the CLI skips them. Delete them, or
  timestamp them if the SQL isn't covered elsewhere.
- **Do next:** run `supabase db pull` into a single **baseline** migration on a staging project, and archive the rest.

### R-12 · Docs and agent clutter
Delete or move to `docs/archive/`:
- `implementation_plan_1.md`
- `product_roadmap.md` (titled "Lovable SaaS")
- `AGENT_PROMPTS.md`, `agent-prompts-v2/`
- `frontend/.../improvements/`, `frontend/.../tasks/`, `backend/improvements/`
- both `.github/agents/` folders (31 files)
- `ROADMAP.md`
- the 16 per-agent `audit/*.md` reports (keep `COVERAGE.md` and this `delivery/` folder)

Then:
- Rewrite `README.md`. It still says MUI Joy, OpenAI and React Context, and has no deploy steps.
- Update `backend/VECTOR_MATCHING_EXPLAINED.md`, which describes the old top-15 matching.
- Commit `CLAUDE.md` (currently untracked).

### R-13 · Public folder leftovers
`public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` (Next starter), `public/internships.json` (seed),
`public/Alex_Mercer_Stacked_CV.md` (a sample CV that anyone can download). Delete them all, and add a real logo
(`public/logo.svg`, plus a dark variant). The sidebar currently loads `/favicon.ico` through `next/image` and shows a
blank tile.

### R-14 · Duplicate CI file
`frontend/pau-interconnect-app/.github/workflows/ci.yml` duplicates the root `ci.yml`, and GitHub ignores it. Delete it.

### R-15 · Two email paths
Brevo and Resend are both wired into `lib/email.ts`, and the backend sends through Resend. Pick **one** provider (Resend has
the simpler API; Brevo has a free tier with a Nigerian sender reputation), send everything through one module, and log every
send to an `email_log` table.
