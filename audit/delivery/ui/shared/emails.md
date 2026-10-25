# Transactional emails

**Files:** `lib/email-templates.ts`, `lib/email.ts`, the HTML in `supabase/functions/deadline-reminders/index.ts`, and backend
Resend calls in `routers/applications.py`
**Seen:** from code 🔎 (redesigned by agent 15: branded layout, dark-mode aware)

## Improvements
| Priority | Change |
|---|---|
| P1 | **One sender, one module.** Today Brevo and Resend are both wired in, and the backend sends separately (04 R-15). |
| P1 | Send from a verified domain (e.g. `notifications@interconnect.pau.edu.ng`) with SPF, DKIM and DMARC, or emails land in spam. |
| P1 | Every email has: a preheader, one primary button, the plain-text alternative, a per-category unsubscribe link (to settings), and the footer address. |
| P1 | Log every send (`email_log`: to, template, status, provider id), and show the delivery status to the employer (partly done for status emails). |
| P2 | Templates to add: application received (student receipt), interview booked (.ics attached), offer made, offer expiring, week awaiting sign-off, weekly digest, employer Monday top-5 (W-6). |
| P2 | Preview route (dev-only) `/dev/emails` rendering every template with sample data in light and dark, plus a Playwright snapshot. |
| P3 | Consider React Email for templates (typed props, the same component kit). |
