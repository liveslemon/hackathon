# Admin overview `/dashboard/admin?tab=overview`

**Files:** `page.tsx`, `AdminClient.tsx`, `AdminParts.tsx`, `overview/OverviewView.tsx` (admin bundle: 1,940 lines)
**Seen:** ✅ light and dark (mock: no backend, so the error state); data layout from code

## Today
Its own shell: a header card ("Admin Control Center", "Super search…", Logout), then pill tabs (Overview · Analytics · Post
Internship · Manage Platform). Overview: 6 tiles (Total Students, Total Employers, Internships Posted, Total Applications,
Applications Today, New Users Today). Data comes through a **server component** that waits up to 15 s for the backend; on
failure it shows a red banner.

## Problems
1. A different shell from the rest of the app: no sidebar, no notifications, a different header (G-10).
2. The tabs are query strings (`?tab=`), but the sidebar links to `/dashboard/admin/manage` and `/analytics`, which 404
   (04 R-8). The back button doesn't step between tabs.
3. The tiles are counts with no trend or action.
4. When the backend is cold, the page sits on a skeleton, or fails with a generic banner (P0-1, P1-6). That's your
   "stuck loading" report.

## Redesign
| Priority | Change |
|---|---|
| P1 | Admin moves into `DashboardShell` with its own nav: Overview · Verification · Users · Postings · Placements · Analytics · Health · Audit log. Each is a **real route** (`/dashboard/admin/verification` …). |
| P1 | Overview = an **action queue first**: employers awaiting verification, reported postings, failed jobs, emails bouncing, then KPIs. |
| P1 | KPIs with a delta (vs. the last 7 days) and a sparkline: students (with a CV %), employers (verified %), open roles, applications, placements, logbook compliance. |
| P1 | KPIs come from one `admin_kpis()` SQL function (PF-2), read directly through Supabase (RLS: admin only) instead of a cold backend round trip. The page renders in < 300 ms. |
| P2 | A "Today" activity feed (sign-ups, postings, offers) from `decision_audit_log` and the events. |
| P2 | The super search becomes the ⌘K palette (W-9): users, companies, postings, actions ("verify Dinoco"). |
