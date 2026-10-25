# 06 · Security and privacy

Earlier audits hardened RLS on every table, locked the matching RPCs to the service role, protected message content, and
scoped company asset uploads. What's left is mostly identity, secrets and compliance.

## Identity and access

| # | Severity | Issue | Fix |
|---|---|---|---|
| S-1 | P0 | Four sources of admin identity (P0-2) | `profiles.role` only, protected by a trigger |
| S-2 | P0 | Weak, published admin passwords (P0-3) | Rotate them; env-based scripts; leaked-password protection |
| S-3 | P0 | Suspension isn't enforced (P0-4) | Ban at the auth layer, plus an RLS `current_user_active()` check |
| S-4 | P1 | No MFA for staff | Supabase TOTP MFA, required (`aal2`) for admin, coordinator and academic supervisor routes, checked in the proxy and RLS (`auth.jwt()->>'aal' = 'aal2'`) |
| S-5 | P2 | Role changes are already blocked once set (`protect_profile_privileges`) ✅. But any signed-in user can insert a `new_message` notification for **any** `user_id` (policy `notifications_insert_messages`), so notifications can be spammed or spoofed. | Create message notifications in a `SECURITY DEFINER` trigger on `messages` (recipient = the other participant), and drop the insert policy |
| S-6 | P1 | Open student sign-up (P1-5) | Domain restriction, or invites |
| S-7 | P2 | The dev mock mode (`dev_mode_role` cookie) is gated on `NODE_ENV === "development"` ✅. Keep it that way. | Add a test asserting the proxy ignores the cookie in production builds |
| S-8 | P2 | Session lifetime and refresh. Your console showed a `token … 400`, a failed refresh. | Make sure the client signs out cleanly with "Please sign in again" on a refresh failure, rather than leaving half-authenticated pages |

## Secrets and config

| # | Issue | Fix |
|---|---|---|
| S-9 | Test-account passwords in `create_test_accounts.py` | Env vars only; delete the accounts from production |
| S-10 | The service role key is used by the Next.js server (some routes) and the backend | Keep it **server-only**. Add a CI grep to fail on `SERVICE_ROLE` in any `"use client"` file or `NEXT_PUBLIC_*` name. |
| S-11 | `CRON_SECRET` for the edge function | Store it in Supabase Vault; rotate it quarterly |
| S-12 | No secret scanning | Turn on GitHub secret scanning and push protection (free for public repos; check the repo's visibility) |

## Data protection: Nigeria Data Protection Act 2023 (NDPA)

The platform processes students' personal data: CVs, phone numbers, academic records and logbooks. Under the NDPA, PAU
(the controller) and this platform (the processor) need the following.

| Requirement | Today | Action |
|---|---|---|
| A lawful basis and clear notice | ✗ no privacy notice or terms page | Add `/privacy` and `/terms`, linked from sign-up with an explicit consent checkbox; store the consent version and time on the profile |
| Data minimisation | ⚠ employers can read every column of student profiles they can see | Expose employer-visible fields through a **view** (`student_public_profile`) instead of the table |
| Rights: access, export, deletion | ✓ export (`/api/me/export`) and self-delete exist | Add a 30-day soft-delete grace period and a deletion receipt email |
| Retention | ✗ | A policy, e.g. CVs and logbooks kept for 2 years after graduation, then purged by a pg_cron job |
| Security of processing | ✓ RLS, private CV bucket, signed URLs | Add MFA for staff, audit-log review, and a breach runbook (72-hour notification) |
| Processor terms with vendors | ✗ | List the sub-processors (Supabase, Vercel, Render, Cohere, the LLM providers, the email provider) on `/privacy`. **Don't send CV text to free-tier LLM providers that train on inputs.** Check each provider's data policy, and prefer paid tiers with no-training terms. |
| Cross-border transfer | Data in Ireland and possibly the US | Document it in the privacy notice; prefer EU regions (P0-1 does this) |

## Application security checklist (do once, then in CI)

- [ ] `npm audit --omit=dev` and `pip-audit` in CI (fail on high or critical).
- [ ] Security headers in `next.config.ts`: `Content-Security-Policy` (start in report-only mode),
      `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- [ ] CORS on FastAPI allows only the production and preview frontend origins (it already reads `FRONTEND_URL`; add preview
      wildcards deliberately).
- [ ] File uploads: PDF magic-byte check (not just the extension), a 5 MB cap (exists), filenames regenerated server-side
      (verify), and virus scanning optional (ClamAV in the worker).
- [ ] An RLS regression suite in CI. pgTAP tests (or Supabase's `supabase test db`) asserting that a student can't read
      another student's logbook, an employer can't read non-applicants, and so on. Today RLS is only tested by hand.
- [ ] An admin actions audit trail viewable in the UI (`decision_audit_log` exists; there's no screen).
