# App shell: sidebar, top bar, page layout

**Files:** `components/Sidebar.tsx`, `TopBar.tsx`, `DashboardShell.tsx`, `DashboardHeader.tsx`, `ThemeToggle.tsx`
**Seen:** ✅ screenshots (student, employer; light and dark)

## What's there
- An icon-only left rail (64 px). The labels exist in code ("Home", "My Internships", "CV & Career", "SIWES Logbook" …) but
  aren't shown.
- The top bar: search ("Search internships…"), theme toggle, notifications bell, avatar + name, logout icon.
- Logo: a blank white tile in an indigo square (it loads `/favicon.ico` through `next/image`).
- Admin doesn't use this shell at all (see admin/overview.md).

## Problems
1. Icon-only nav is hard to learn. "CV & Career" and "SIWES Logbook" icons are generic.
2. No Messages entry (P1-9), and the notifications bell is the only way to see updates.
3. The admin links in `Sidebar.tsx` point to `/dashboard/admin/manage` and `/dashboard/admin/analytics`, which don't exist.
4. The logout icon sits next to the avatar with no confirmation and no label, so it's easy to hit by accident.
5. No breadcrumb or page title in the bar. On deep pages (an applicant in a pipeline) you lose your place.
6. Mobile: the rail collapses into a drawer. Students on phones need a bottom tab bar.

## Improvements
| Priority | Change |
|---|---|
| P1 | Expanded sidebar by default on ≥ 1024 px: logo + product name, labelled items, active pill, a section divider ("Account"), and a collapse toggle that remembers its state (localStorage). Collapsed = icons + tooltips. |
| P1 | Add **Messages** (with an unread count) to student and employer nav; add **Notifications** to the avatar menu. |
| P1 | Real logo (`public/logo.svg`, `logo-dark.svg`), via `<img>` or an inline SVG component, not `next/image` on an `.ico`. |
| P1 | Avatar menu (DropdownMenu): Profile, Settings, Theme (light/dark/system), Help, Sign out (with a confirm). Remove the bare logout icon. |
| P2 | Breadcrumbs under the top bar for depth ≥ 2: `Postings / Frontend Intern / Applicants`. |
| P2 | Mobile bottom tab bar (< 768 px) for students: Home · Internships · Logbook · Messages · Profile. Employers: Home · Postings · Applicants · Messages · More. |
| P2 | Global ⌘K command palette (W-9), replacing the top-bar search input with a button that shows the shortcut. |
| P3 | A "What's new" dot on the avatar after releases (a changelog drawer). |

## Acceptance
- Every nav item has a visible label at ≥ 1024 px, and a tooltip with `aria-label` when collapsed.
- No link in the shell returns 404 (add a Playwright check that crawls the nav links per role).
