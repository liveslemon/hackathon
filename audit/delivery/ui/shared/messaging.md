# Messaging

**Files:** `components/MessageThread.tsx`, `app/api/messages/*`
**Seen:** from code 🔎. It's only reachable from employer applicant review.

## Today
A thread component (bubbles, timestamps, read state, composer), opened in a modal from applicant review. The student side
has no entry point except a notification. `/api/messages/unread` exists but nothing calls it.

## New page: `/messages` (both roles)
| Area | Design |
|---|---|
| Layout | Two panes at ≥ 1024 px: conversation list (left) and thread (right). One pane on mobile, with a back button. |
| List item | Avatar/logo, name, the internship it's about, last message preview, time, unread dot. Search box at the top. |
| Thread header | The person + role + internship, with a link to the application. Employer extra: the stage pill + quick stage change. |
| Composer | Auto-growing textarea; Enter to send, Shift+Enter for a newline; attachments later; **saved replies** for employers ("Interview invite", "We've reviewed your application…"). |
| States | Sending / failed (retry) / delivered / read; typing indicator through Realtime presence (P3). |
| Safety | Students can report a message. Contact details in a first message trigger a soft warning (anti-scam). |

## Acceptance
- An unread count appears in the nav for both roles and updates in realtime.
- A student can reply to an employer without going through notifications.
