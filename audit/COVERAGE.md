# Coverage map

Every page, Next API route and FastAPI endpoint on `integration`, with the agent that owns it.
"Verified" means the owner's audit report covers it. Items marked *integrator* weren't named in the owner's report, so the integrator checked the auth dependency and added or confirmed a test.
Tables, RLS policies, triggers and RPCs: see the schema map in [08-platform-db.md](08-platform-db.md), plus the per-area migrations listed in each report.

| Kind | Route | Owner | Status |
|---|---|---|---|
| Page | `/admin` | 07 | ✅ verified (07-admin-notify.md) |
| Page | `/companies/[id]` | 03 | ✅ verified (03-discovery-apply.md) |
| Page | `/cv/view` | 02 | ✅ verified (02-ai-cv.md) |
| Page | `/dashboard/admin` | 07 | ✅ verified (07-admin-notify.md) |
| Page | `/dashboard/analytics` | 06 | ✅ verified (06-employer.md) |
| Page | `/dashboard/employer/analytics` | 06 | ✅ verified (06-employer.md) |
| Page | `/dashboard/employer/internships/[id]/edit` | 06 | ✅ verified (06-employer.md) |
| Page | `/dashboard/employer/internships/[id]` | 06 | ✅ verified (06-employer.md) |
| Page | `/dashboard/employer/internships` | 06 | ✅ verified (06-employer.md) |
| Page | `/dashboard/employer/logbook` | 05 | ✅ verified (05-logbook.md) |
| Page | `/dashboard/employer` | 06 | ✅ verified (06-employer.md) |
| Page | `/dashboard/employer/reports` | 05 | ✅ verified (05-logbook.md) |
| Page | `/dashboard/employer/settings` | 04 | ✅ verified (04-profile-privacy.md) |
| Page | `/dashboard` | 01 | ✅ verified (01-auth.md) |
| Page | `/dashboard/post` | 06 | ✅ verified (06-employer.md) |
| Page | `/dashboard/student/cv` | 02 | ✅ verified (02-ai-cv.md) |
| Page | `/dashboard/student/logbook` | 05 | ✅ verified (05-logbook.md) |
| Page | `/dashboard/student/logbook/print` | 05 | ✅ verified (05-logbook.md) |
| Page | `/dashboard/student` | 03 | ✅ verified (03-discovery-apply.md) |
| Page | `/dashboard/student/settings` | 04 | ✅ verified (04-profile-privacy.md) |
| Page | `/dashboard/student/skills` | 02 | ✅ *integrator*: page is a redirect to /dashboard/student/cv |
| Page | `/internships/[id]` | 03 | ✅ verified (03-discovery-apply.md) |
| Page | `/login/admin` | 01 | ✅ verified (01-auth.md) |
| Page | `/login/employer` | 01 | ✅ verified (01-auth.md) |
| Page | `/login/forgot-password` | 01 | ✅ verified (01-auth.md) |
| Page | `/login/reset-password` | 01 | ✅ verified (01-auth.md) |
| Page | `/login/student` | 01 | ✅ verified (01-auth.md) |
| Page | `/my-internships` | 03 | ✅ verified (03-discovery-apply.md) |
| Page | `/onboarding/employer` | 01 | ✅ verified (01-auth.md) |
| Page | `/onboarding` | 01 | ✅ verified (01-auth.md) |
| Page | `/` | 01 | ⚠️ *integrator*: static landing page, builds. Not in 01's report; check manually |
| Page | `/profile/[id]` | 04 | ✅ verified (04-profile-privacy.md) |
| Page | `/profile` | 04 | ✅ verified (04-profile-privacy.md) |
| Page | `/test-components` | 09 | ✅ verified (09-ui-qa.md) |
| Page | `/test-connection` | 09 | ✅ verified (09-ui-qa.md) |
| Next API | `/api/analysis/metrics` | 02 | ✅ verified (02-ai-cv.md) |
| Next API | `/api/applications/[id]/accept` | 03 | ✅ verified (03-discovery-apply.md) |
| Next API | `/api/applications/[id]/complete` | 05 | ✅ verified (05-logbook.md) |
| Next API | `/api/applications/[id]/stage` | 06 | ✅ verified (06-employer.md) |
| Next API | `/api/applications/[id]/status` | 06 | ✅ verified (06-employer.md) |
| Next API | `/api/applications/[id]/withdraw` | 03 | ✅ verified (03-discovery-apply.md) |
| Next API | `/api/applications` | 03 | ✅ verified (03-discovery-apply.md) |
| Next API | `/api/audit/[targetId]` | 06 | ✅ verified (06-employer.md) |
| Next API | `/api/auth/logout` | 01 | ✅ verified (01-auth.md) |
| Next API | `/api/cv/upload` | 02 | ✅ verified (02-ai-cv.md) |
| Next API | `/api/internships/[id]` | 06 | ✅ verified (06-employer.md) |
| Next API | `/api/internships/[id]/status` | 06 | ✅ verified (06-employer.md) |
| Next API | `/api/internships/post` | 06 | ✅ verified (06-employer.md) |
| Next API | `/api/internships/templates/[id]` | 06 | ✅ verified (06-employer.md) |
| Next API | `/api/internships/templates` | 06 | ✅ verified (06-employer.md) |
| Next API | `/api/logbook/bulk-status` | 05 | ✅ verified (05-logbook.md) |
| Next API | `/api/logbook/employer` | 05 | ✅ verified (05-logbook.md) |
| Next API | `/api/logbook/enhance` | 05 | ✅ verified (05-logbook.md) |
| Next API | `/api/logbook/entry/[id]/status` | 05 | ✅ verified (05-logbook.md) |
| Next API | `/api/logbook/entry` | 05 | ✅ verified (05-logbook.md) |
| Next API | `/api/logbook/student` | 05 | ✅ verified (05-logbook.md) |
| Next API | `/api/me/export` | 04 | ✅ verified (04-profile-privacy.md) |
| Next API | `/api/messages/[conversationId]` | 06 | ✅ verified (06-employer.md) |
| Next API | `/api/messages/start` | 06 | ✅ verified (06-employer.md) |
| Next API | `/api/messages/unread` | 06 | ✅ verified (06-employer.md) |
| Next API | `/api/onboarding/complete` | 01 | ✅ verified (01-auth.md) |
| Next API | `/api/onboarding/status` | 01 | ✅ verified (01-auth.md) |
| Next API | `/api/reports/logbook` | 05 | ✅ verified (05-logbook.md) |
| FastAPI | `GET /admin/stats` | 07 | ✅ verified (07-admin-notify.md) |
| FastAPI | `GET /admin/analytics` | 07 | ✅ verified (07-admin-notify.md) |
| FastAPI | `GET /admin/directory` | 07 | ✅ verified (07-admin-notify.md) |
| FastAPI | `GET /admin/search` | 07 | ✅ verified (07-admin-notify.md) |
| FastAPI | `GET /admin/llm-health` | 07 | ✅ verified (07-admin-notify.md) |
| FastAPI | `POST /admin/users/{user_id}/suspend` | 07 | ✅ *integrator*: auth dependency checked; tested in backend/tests |
| FastAPI | `POST /admin/users/{user_id}/reinstate` | 07 | ✅ *integrator*: auth dependency checked; tested in backend/tests |
| FastAPI | `POST /admin/employers/{employer_id}/verify` | 07 | ✅ *integrator*: auth dependency checked; tested in backend/tests |
| FastAPI | `POST /admin/employers/{employer_id}/unverify` | 07 | ✅ *integrator*: auth dependency checked; tested in backend/tests |
| FastAPI | `POST /admin/internships/{internship_id}/status` | 07 | ✅ *integrator*: auth dependency checked; tested in backend/tests |
| FastAPI | `GET /skill-gap` | 02 | ✅ verified (02-ai-cv.md) |
| FastAPI | `GET /api/analysis/skill-gap` | 02 | ✅ verified (02-ai-cv.md) |
| FastAPI | `GET /metrics` | 02 | ✅ verified (02-ai-cv.md) |
| FastAPI | `GET /analysis/metrics` | 02 | ✅ verified (02-ai-cv.md) |
| FastAPI | `POST /draft-cover-letter` | 03 | ✅ *integrator*: auth dependency checked; tested in backend/tests |
| FastAPI | `POST /draft-cover-letter-stream` | 03 | ✅ *integrator*: auth dependency checked; tested in backend/tests |
| FastAPI | `POST /submit-application` | 03 | ✅ *integrator*: auth dependency checked; tested in backend/tests |
| FastAPI | `PUT /applications/{app_id}/status` | 03 | ✅ *integrator*: auth dependency checked; tested in backend/tests |
| FastAPI | `GET /internships/{internship_id}/applicants` | 03 | ✅ *integrator*: auth dependency checked; tested in backend/tests |
| FastAPI | `GET /applications/student` | 03 | ✅ *integrator*: auth dependency checked; tested in backend/tests |
| FastAPI | `POST /upload-and-analyze` | 02 | ✅ verified (02-ai-cv.md) |
| FastAPI | `POST /analyze-new-internship` | 02 | ✅ verified (02-ai-cv.md) |
| FastAPI | `POST /analyze-existing-cv` | 02 | ✅ verified (02-ai-cv.md) |
| FastAPI | `POST /refresh-cv-url` | 02 | ✅ verified (02-ai-cv.md) |
| FastAPI | `GET /my-matches` | 02 | ✅ verified (02-ai-cv.md) |
| FastAPI | `GET /recommendations` | 02 | ✅ verified (02-ai-cv.md) |
| FastAPI | `GET /debug/match-results/{user_id}` | 02 | ✅ verified (02-ai-cv.md) |
| FastAPI | `POST /api/logbook/enhance` | 05 | ✅ verified (05-logbook.md) |
| FastAPI | `POST /api/logbook/entry` | 05 | ✅ verified (05-logbook.md) |
| FastAPI | `GET /api/logbook/student` | 05 | ✅ verified (05-logbook.md) |
| FastAPI | `GET /api/logbook/employer` | 05 | ✅ verified (05-logbook.md) |
| FastAPI | `PATCH /api/logbook/entry/{entry_id}/status` | 05 | ✅ *integrator*: auth dependency checked; tested in backend/tests |
| FastAPI | `POST /api/logbook/bulk-status` | 05 | ✅ verified (05-logbook.md) |
| FastAPI | `PATCH /api/employer/profile` | 04 | ✅ verified (04-profile-privacy.md) |
| FastAPI | `GET /api/companies/{employer_id}` | 04 | ✅ verified (04-profile-privacy.md) |
| FastAPI | `POST /api/me/delete` | 04 | ✅ verified (04-profile-privacy.md) |
| FastAPI | `POST /api/me/refresh-matches` | 04 | ✅ verified (04-profile-privacy.md) |
| FastAPI | `GET /` | 08 | ✅ verified (08-platform-db.md) |
| FastAPI | `GET /health` | 08 | ✅ verified (08-platform-db.md) |
| FastAPI | `GET /ready` | 08 | ✅ verified (08-platform-db.md) |
| FastAPI | `GET /health-check` | 08 | ✅ *integrator*: public liveness endpoint by design |
| FastAPI | `GET /test-supabase` | 08 | ✅ verified (08-platform-db.md) |
