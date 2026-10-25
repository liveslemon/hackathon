# New page: admin health panel `/dashboard/admin/health`

**Why:** today you diagnose by calling APIs by hand. `GET /api/admin/llm-health` exists with no UI (it took 35 s on 25
Oct, with Gemini timing out).

## Layout
| Card | Content | Source |
|---|---|---|
| Services | Frontend, Backend web, Worker, Database. A status dot, response time, version (git SHA), last deploy. | `/ready` + `/version` (add one) |
| Job queue | Queued / processing / failed counts; oldest queued age; a table of the last 20 failures with error and **Retry** / **Discard** | `cv_processing_jobs` |
| AI providers | Per provider: OK / slow / down, latency, last error; "AI summaries paused until 14:30 (quota)" banner | `llm-health` (cached 5 min, run in the background, never on page load) |
| Matching | Coverage % (scored pairs ÷ possible), last backfill run, a **Run backfill** button (dry-run first) | SQL |
| Email | Sent / bounced / failed (24 h); last 10 failures | `email_log` (R-15) |
| Scheduled jobs | deadline-reminders, offer-expiry, stats refresh: last run, next run, result | `cron.job_run_details` |

## Rules
- Admin only, with MFA (S-4).
- Every button is audited.
- The page itself never waits on a slow dependency. Each card loads independently, with a timeout.
