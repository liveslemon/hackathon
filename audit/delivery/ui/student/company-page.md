# Company page `/companies/[id]`

**Files:** `page.tsx`, `CompanyClient.tsx` (287 lines)  **Seen:** code 🔎 (mock IDs 404)

## Improvements
| Priority | Change |
|---|---|
| P1 | Header: banner (with a token-based gradient fallback), logo, name, **✓ Verified** badge (P1-4), industry, website, location. |
| P1 | Open roles list using the redesigned internship card, sorted by the viewer's match. Empty state: "No open roles right now. Follow to get notified." |
| P1 | **Follow** (the `company_followers` table exists, with no UI) → notify followers when a role is posted. |
| P2 | About / Culture / Mentorship sections from employer settings; "Past PAU interns" count and quotes (with consent). |
| P2 | Make it static or ISR (public content) with OpenGraph tags. |
