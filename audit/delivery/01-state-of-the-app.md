# 01 · State of the app

## Deployment topology

```
Browser ──► Vercel (Next.js 16, region dub1 / Dublin)
              │  ├─ server components & 28 route handlers ──► Supabase Postgres + Auth + Storage (eu-west-1, Ireland)
              │  └─ some calls go straight from the browser to the backend
              ▼
          Render web service "pau-interconnect-backend" (FastAPI, 2 uvicorn workers)
              ├─ in-process job worker (one per uvicorn worker)
              ├─ Cohere embeddings, LLM failover (Gemini, Groq, Cohere, OpenRouter, Together, NVIDIA)
              └─ Resend email
          Supabase Edge Function "deadline-reminders" (needs a pg_cron schedule set by hand ❓)
          GitHub Actions: CI on push/PR, and "Keep Render Backend Alive" (scheduled every 14 min, really runs every 2–4 h ✅)
```

- **Render region** isn't set in `render.yaml`, so it defaults to Oregon (US) ❓. If that's right, every frontend → backend →
  database round trip crosses the Atlantic twice.
- **Render plan** isn't set either. The keep-alive workflow exists because the service sleeps, so this is the free tier ✅
  (behaviour measured, see 02).

## Versions in play

| Branch | Commit | What it contains |
|---|---|---|
| `main` (production) | `c001450` | Full audit fixes, 8 migrations |
| `dev` (local) | `eb92ff2` | +39 commits: matching redesign, UI foundation, all page redesigns, 6 matching fixes, contrast and token fixes. **Not pushed.** |

The matching migration (`20261014110000`) **is** live in production, so the database is ahead of the production code.

## Production data (read-only, 25 Oct) ✅

| Metric | Value |
|---|---|
| Students | 15 (9 with a CV) |
| Employers | 3 (**0 verified**, one with no company name) |
| Open internships | 25 |
| Applications | 12 |
| Match rows | 110 of a possible 225 (9 students × 25 open internships) = **49% coverage** |
| AI "why you match" summaries | 0 (the new code isn't deployed) |
| Failed jobs | 8, all `Unknown job kind 'user_rescore'`. The backfill ran on 12 Oct against the old backend. |

## Surface area

### Pages (35)
- **Public / entry (9):** `/`, `/login/{student,employer,admin}`, `/login/forgot-password`, `/login/reset-password`,
  `/onboarding`, `/onboarding/employer` (redirect), `/admin` (a second admin login)
- **Student (12):** `/dashboard/student`, `/internships/[id]`, `/my-internships`, `/dashboard/student/cv`,
  `/dashboard/student/skills` (redirect), `/dashboard/student/logbook`, `.../logbook/print`, `/dashboard/student/settings`,
  `/profile`, `/profile/[id]`, `/companies/[id]`, `/cv/view`
- **Employer (10):** `/dashboard/employer`, `/dashboard/employer/internships`, `.../internships/[id]`, `.../[id]/edit`,
  `/dashboard/post`, `/dashboard/employer/analytics`, `/dashboard/analytics` (redirect), `/dashboard/employer/logbook`,
  `/dashboard/employer/reports`, `/dashboard/employer/settings`
- **Admin (2):** `/dashboard/admin` (4 tabs: overview, analytics, post, manage), `/dashboard` (role redirect)
- **Dev only (2):** `/test-components`, `/test-connection`

### Next.js route handlers (28)
`analysis/metrics`, `applications` (+ `[id]/accept`, `complete`, `stage`, `status`, `withdraw`), `audit/[targetId]`,
`auth/logout`, `cv/upload`, `internships/[id]` (+ `status`), `internships/post`, `internships/templates` (+ `[id]`),
`logbook/{bulk-status,employer,enhance,entry,entry/[id]/status,student}`, `me/export`, `messages/{[conversationId],start,unread}`,
`onboarding/{complete,status}`, `reports/logbook`

### FastAPI endpoints (36 distinct; 31 also registered without the `/api` prefix, 67 routes in all)

| Router | Endpoints | Used by the UI? 🔎 |
|---|---|---|
| admin | stats, analytics, directory, search, llm-health, suspend, reinstate, verify, unverify, internship status | llm-health ✗, internship status ✗ |
| analysis | skill-gap, metrics | ✓ |
| applications | draft-cover-letter (+ stream), submit-application, applications/{id}/status, internships/{id}/applicants, applications/student | only cover letters ✓; the other 4 ✗ |
| cv | upload-and-analyze, analyze-new-internship, analyze-existing-cv, refresh-cv-url, my-matches, recommendations, debug/match-results | analyze-existing-cv ✗, my-matches ✗ |
| logbook | enhance, entry, student, employer, entry/{id}/status, bulk-status | only enhance ✓ (the UI uses the Next copies) |
| profiles | employer/profile, companies/{id}, me/delete, me/refresh-matches | companies ✗ |
| system | /, health, ready, health-check, test-supabase | infra only |

### Database tables (16)
`profiles`, `internships`, `applied_internships`, `application_stage_history`, `decision_audit_log`, `match_results`,
`skill_gap_analyses`, `cv_processing_jobs`, `logbook_entries`, `conversations`, `messages`, `notifications`,
`internship_templates`, `saved_internships`, `liked_internships`, `company_followers`

There's no table for: companies (an employer *is* a profile), placements (they're columns on `applied_internships`),
academic supervisors, SIWES cohorts, interviews, or offers.

## Tests and CI ✅
- 18 Vitest files (189 tests), 23 pytest files (183 tests), 10 Playwright specs.
- CI (`.github/workflows/ci.yml`) runs lint, typecheck, Vitest, the build and pytest on push/PR. **Playwright isn't in CI.**
- A second, unused `ci.yml` sits in `frontend/pau-interconnect-app/.github/workflows/`. GitHub only reads the root one.
