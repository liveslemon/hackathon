# Student settings `/dashboard/student/settings`

**Files:** `page.tsx`, `StudentSettingsClient.tsx` (607 lines)  **Seen:** code 🔎

## Today
Sections: Interface Theme (Light / Dark / System) · Notification Channels (application updates by email, employer inbox
messages) · Data & Privacy Visibility (phone, email visibility) · Security & Account Management (Update Password, Sign Out,
Delete Forever with "Type DELETE to confirm"). Save Preferences.

## Improvements
| Priority | Change |
|---|---|
| P1 | Settings left-nav (Account · Notifications · Privacy · Appearance · Data) on desktop; stacked on mobile. Each section saves on its own. |
| P1 | Notifications become a **matrix** (rows = event types from the 03 notification matrix, columns = In-app / Email / Digest). |
| P1 | Data: "Download my data" (`/api/me/export` exists) next to delete; deletion explains the 30-day grace period (06) and sends a receipt. |
| P2 | Security: active sessions list with "Sign out other devices"; MFA opt-in; linked SSO account. |
| ✅ | Theme already stays in sync with the top-bar toggle (both use the same `useTheme`). Keep it. |
| P3 | Language (English only for now, but leave the slot for a locale switch). |
