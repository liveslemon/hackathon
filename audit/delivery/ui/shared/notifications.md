# Notifications (bell, dropdown, in-app)

**Files:** `components/NotificationBell.tsx`, `lib/notifications.ts`, `notifications` table (Realtime)
**Seen:** bell ✅; dropdown from code 🔎

## Today
A bell with an unread badge (`bg-danger text-on-danger`, fixed in the last integration), a dropdown list, mark-all-read and
per-type icons. Realtime updates via Supabase. Opt-outs come from `NOTIFICATION_OPT_OUT_MAP`.

## Improvements
| Priority | Change |
|---|---|
| P1 | **Group by day** ("Today", "Yesterday", "Earlier") and **by type** filters (Applications · Messages · Logbook · System). |
| P1 | Every notification is **actionable**: a primary action inline ("View application", "Reply", "Review week"). Clicking marks it read and deep-links to the item. |
| P1 | An empty state with a friendly illustration and "You're all caught up." |
| P2 | A `/notifications` full page (pagination, search) for history beyond the dropdown's 20. |
| P2 | **Digest mode** in settings: instant / daily / weekly email for each category (03 notification matrix). |
| P2 | Coalesce bursts: "3 new applicants for Frontend Intern" instead of 3 rows. |
| P3 | Desktop push (Web Push) once the PWA lands (W-10). |

## Copy examples
- ✅ "Ada Obi moved you to **Interview** for Frontend Intern at GreenStack. Pick a time by Fri."
- ❌ "Application status updated."
