# Wave 0: status (25 Oct 2026)

## Done (by Claude Code)

| # | Task | Result |
|---|---|---|
| 1 | Commit the audit, plan, CLAUDE.md and prompts | `b4d7787` on `dev` |
| 5 | Ship `dev` → production | PR #21 merged (`185233f`), CI green. Vercel built. Render redeployed at 21:18, verified by a canary `user_rescore` job completing on worker `worker-63-ece49f`. |
| 5 | Backfill match scores | 9 students enqueued, 9 jobs complete. Coverage = **100% of open roles** (27 scores = 9 students × 3 open roles). |
| 5 | Delete the 8 failed `Unknown job kind` jobs | Deleted; 0 failed jobs remain. |
| — | Removed the leftover `_probe.mjs` (it contained a test password) | Deleted (never committed). |

### Found while doing it
- **22 of the 25 "active" internships are past their deadline** (Feb–Sep 2026) and still say active. The new matching correctly ignores them,
  which is why scores went from 110 to 27. An auto-expiry job was added to agent 35's wave 2 scope. Until then, close them by hand or ask me to.
- The 3 open roles are test postings (skills like "ego", "money, cash"), so the top score is 35% and no AI summaries (≥ 80%) exist yet.
  That's expected.

## Your turn (dashboards only you can reach)

Tick these off. Wave 1 can start once 2, 3, 4 and 6 are done.

- [ ] **2. Render: free plan, in Europe, kept awake** (decision 25 Oct: stay on free for now; upgrade to Starter before real users).
  1. Render → New → Web Service → this repo. Root `backend`, region **Frankfurt**, instance type **Free**.
     Build: `pip install -r requirements.txt`. Start: `python -m uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1` (1 worker: the free instance has ~512 MB RAM).
  2. Copy every env var from the current service (Environment tab → copy each).
  3. When it's live, set Vercel → Settings → Environment Variables → `NEXT_PUBLIC_BACKEND_URL` = the new URL (Production + Preview), and redeploy.
  4. Update `FRONTEND_URL` on the new Render service if needed. Then **delete** the old Oregon service (two free services can't both stay awake on the ~750 free hours a month).
  5. UptimeRobot (free) → New monitor → HTTP(s) → `<new backend URL>/ready`, every **5 minutes**, with an email alert. This is what keeps it awake.
  Tell me the new URL, and I'll verify latency and update `render.yaml` and the keep-alive URL.
- [ ] **3. Passwords.** Supabase → Authentication → Users:
  - for `admin@pau.edu.ng` and `admin2@pau.edu.ng`, use "Send password recovery" (or set a new 16+ character password in a password manager)
  - delete the test accounts you don't need (`student@pau.edu.ng`, `employer@pau.edu.ng` from `create_test_accounts.py`, if they exist)
- [ ] **4. Supabase Auth settings.** Authentication → Providers → Email: minimum password length **10**, **Leaked password protection** on.
  Authentication → Multi-Factor: enable **TOTP**.
- [ ] **6. Staging.**
  1. Create a second Supabase project, "interconnect-staging" (eu-west-1).
  2. In it: Database → Extensions → enable `vector`, `pg_cron`, `pg_net`.
  3. Send me the staging project ref. I'll link it and push all migrations to it.
  4. Render: a second service "pau-interconnect-backend-staging" (Frankfurt, Starter or free is fine for staging) pointing at the `dev` branch.
  5. Vercel: set Preview env vars to the staging Supabase URL/anon key and the staging backend URL.
- [ ] **7. Monitoring.**
  - Sentry → create 2 projects (Next.js, Python FastAPI) → copy the DSNs into Vercel (`NEXT_PUBLIC_SENTRY_DSN`) and Render (`SENTRY_DSN`).
    Agent 21 wires the code.
  - Better Stack or UptimeRobot → an HTTP monitor on `<backend>/ready` every 1 min, plus one on the frontend URL, with email alerts.
- [ ] **8. Plans to check.** Vercel → Settings → Billing (Pro for a university production app). Supabase → Billing (Pro for daily backups).
  Supabase → Database → Extensions: is `pg_cron` enabled?
- [ ] **9. Decisions** (reply with them, and I'll record them here for agents 35 and 45):
  - SSO: does PAU use **Google Workspace** or **Microsoft 365** for student and staff email?
  - Email provider: **Resend** or **Brevo** (Resend recommended).
  - Sender domain, e.g. `notifications@interconnect.pau.edu.ng` (needs DNS records from PAU IT).
- [ ] **10. PAU sign-off** on using PAU's name and "official" wording on the landing page. Until it arrives, agent 27 removes those claims.

## Decisions log
| Decision | Value | Date |
|---|---|---|
| Render plan | Free (Frankfurt) + 5-min external pinger; worker stays inline | 25 Oct 2026 |
| SSO provider | _pending_ | |
| Email provider | _pending_ (default Resend) | |
| Sender domain | _pending_ | |
