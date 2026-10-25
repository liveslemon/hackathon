# 05 · Architecture, performance and reliability

## Target architecture

```
                   ┌───────────────────────────── Vercel (dub1) ─────────────────────────────┐
 Browser ─────────►│ Next.js: pages (RSC) + route handlers (all CRUD, via Supabase + RLS)    │
                   └───────────────┬───────────────────────────────┬─────────────────────────┘
                                   │ SQL / PostgREST (RLS)          │ HTTPS (AI only)
                                   ▼                               ▼
            ┌──────── Supabase (eu-west-1) ────────┐     ┌──── AI service (EU, always on) ─────┐
            │ Postgres: tables, RLS, transition    │◄────│ FastAPI web: cover letter, enhance, │
            │ functions, triggers, outbox, pg_cron │     │ skill gap, upload → enqueue         │
            │ Auth (MFA for staff) · Storage       │     ├─────────────────────────────────────┤
            │ Realtime (notifications, messages)   │◄────│ Worker process (separate): CV parse/│
            └──────────────────────────────────────┘     │ OCR, embeddings, matching, AI       │
                                                         │ summaries, emails                   │
                                                         └─────────────────────────────────────┘
```

Key changes from today:
1. **FastAPI becomes the AI service only** (04, R-1 to R-4).
2. **The worker runs as its own process**, not inside each web worker. Today each of the 2 uvicorn workers runs its own
   poll loop. That doubles the polling, and the "AI credits exhausted" pause and the rate limits are kept per process.
   On Render: one **Web Service** plus one **Background Worker**, from the same repo with different start commands.
3. **Events come from the database, not from callers.** An `outbox` table, filled by triggers on `internships` and
   `profiles`, means *any* write path (an admin form, a SQL fix, a future mobile app) queues the right rescore. Today, only
   the code paths that remember to call `/api/analyze-new-internship` do (P1-3).
4. **Everything runs in one region (EU).**

## Hosting recommendation

| Component | Today | Recommended | Approx. cost |
|---|---|---|---|
| Frontend | Vercel Hobby ❓ | **Vercel Pro.** Hobby is for personal, non-commercial use, and Pro raises function limits. | $20/mo |
| Backend web | Render free (sleeps) ✅, region unset (Oregon by default ❓) | Render **Starter**, `region: frankfurt` | $7/mo |
| Worker | in-process | Render Background Worker **Starter**, Frankfurt | $7/mo |
| Database | Supabase (plan ❓) | Supabase **Pro**: daily backups, no pausing, PITR add-on available | $25/mo |
| Email | Brevo + Resend | One provider, on a verified `pau.edu.ng` subdomain (SPF, DKIM, DMARC) | free tier at this volume |
| Monitoring | none | Sentry (free tier), Better Stack or UptimeRobot (free) | $0 |

That's roughly **$60/month** for an always-on, backed-up, monitored setup. The biggest single win is the first $7: Starter
removes the 30–75 s cold starts.

## Latency budget (warm, EU)

| Hop | Target | Today (measured from Lagos to the backend) |
|---|---|---|
| Browser → Vercel (dub1) | 80–120 ms | — |
| Vercel → Supabase (eu-west-1) | < 5 ms | same region ✅ |
| Vercel → backend | < 10 ms if Frankfurt or Dublin | ~150 ms if Oregon ❓ |
| Backend → Supabase | < 10 ms if EU | ~150 ms per query if Oregon ❓ |
| API p95 (CRUD) | < 300 ms | 300–500 ms ✅ |
| AI endpoints p95 | < 8 s (stream the first token in < 2 s) | not measured |

Admin stats makes 6 count queries. From Oregon that's about 0.9 s spent on the network alone. Moving the backend to the EU
cuts most of it.

## Performance work, page by page (highest impact first)

| # | Issue | Fix |
|---|---|---|
| PF-1 | The student dashboard selects **all** internships, then **all** of the student's matches, and joins and filters in JS (`DashboardParts.tsx`). | A `student_feed` SQL view or RPC: open internships ⨝ the student's `match_results` ⨝ application state, ordered by score, **paginated** (24 per page), with filters pushed down to SQL. |
| PF-2 | Admin overview runs 6 sequential count queries in the backend. | One SQL function, `admin_kpis()`, returning a JSON object. Cache it for 60 s. |
| PF-3 | Public pages (landing, `/companies/[id]`, `/internships/[id]` for anonymous users) render dynamically on every request. | Static or ISR (`revalidate: 300`) for public views; personalised parts (match score, applied state) in a small client island. |
| PF-4 | The internship detail waits on several sequential Supabase queries. | `Promise.all` (partly done), plus one RPC for "internship + my match + my application". |
| PF-5 | Client timeouts are 15 s × 2; server components block on the backend. | 8 s reads and 20 s AI; `Suspense` per widget; AI widgets never block the page shell. |
| PF-6 | Unused MUI, Emotion and `react-icons` are installed (04 R-9). | Remove them. Check `next build` output for the largest route chunks after removal. |
| PF-7 | Company logos and banners are full-size uploads. | Supabase Storage image transforms (`?width=128`), with `next/image` `remotePatterns` set. |
| PF-8 | No database query monitoring. | Turn on `pg_stat_statements` (on by default in Supabase), and review the slowest 10 monthly. Add indexes there, not guessing. |

## Reliability work

| # | Item | Detail |
|---|---|---|
| RL-1 | Always-on backend | P0-1 |
| RL-2 | Separate worker process | above |
| RL-3 | Outbox-driven jobs | above; also gives exactly-once enqueue per change |
| RL-4 | Job queue alerts | Alert when `failed` grows, or a `queued` job is older than 10 min. Expose `/ready` → `queue_depth`, `oldest_queued_s`. |
| RL-5 | Rate limits in Postgres | Replace the in-memory per-process limiter with a `rate_limits` table (a fixed window per user and bucket, `INSERT ... ON CONFLICT`), or Upstash Redis. Today, 2 processes means double the limit, and a restart resets it. |
| RL-6 | LLM providers | 6 free-tier providers is fragile and slow to fail over: the health check took 35 s, with Gemini timing out. Keep **2** (one paid, cheap: Gemini Flash or Groq), use 10 s timeouts, and a circuit breaker stored in the DB, so all processes share it. |
| RL-7 | Backups | Supabase Pro daily backups. A monthly restore drill into staging. Export storage buckets (CVs) weekly. |
| RL-8 | Graceful degradation | Every AI feature already has a non-AI fallback (matching explanations, logbook without enhance). Make the UI say "AI is busy, try again in a minute" rather than showing an error. |
| RL-9 | Idempotent writes | Applying, accepting an offer and approving a week should send an `Idempotency-Key` (a UUID per click) that the server records, so a double tap or retry never duplicates. |
| RL-10 | Deploy order | Migrations first (must be backward compatible), then the worker, then the web backend, then the frontend. Document it in `docs/RELEASE.md` (08). |
