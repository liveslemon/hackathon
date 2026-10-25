# 404, error and loading pages

**Files:** `app/not-found.tsx`, `app/error.tsx`, `app/loading.tsx`, `app/dashboard/error.tsx`, per-role `error.tsx`
**Seen:** ✅ 404 (light and dark)

## Today
A clean 404 card: a compass icon, "404 Page Not Found", "Back to Home" / "Go to Dashboard". Error boundaries exist for the
dashboards.

## Improvements
| Priority | Change |
|---|---|
| P1 | Error pages show a **reference ID** (the Sentry event ID) and "Try again" + "Contact support (include this code)". |
| P1 | A role-aware "Go to dashboard" (a student lands on the student dashboard, not a redirect chain). |
| P2 | Add `loading.tsx` / `error.tsx` to every route group that lacks them (see ui/README G-4). |
| P2 | A "server is waking up" variant: if a request takes > 3 s, swap the skeleton for a friendly message with a progress pulse (and fix the root cause, P0-1). |
| P3 | 404: suggest the 3 closest routes, or search ("Looking for internships?"). |
