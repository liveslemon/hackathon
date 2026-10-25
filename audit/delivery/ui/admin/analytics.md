# Admin analytics `/dashboard/admin?tab=analytics`

**Files:** `analytics/AnalyticsView.tsx`, `AnalyticsCharts.tsx`, plus `app/dashboard/AnalyticsView.tsx` ("Platform Analytics",
"Internships by Category")  **Seen:** ✅ error state; charts from code

## Improvements
| Priority | Change |
|---|---|
| P1 | One analytics page (there are two "AnalyticsView" components today: `app/dashboard/AnalyticsView.tsx` and `admin/analytics/AnalyticsView.tsx`); delete the other. |
| P1 | Funnel for the session: sign-ups → onboarded → CV uploaded → applied → interviewed → offered → placed → completed, filterable by programme and level. This is the coordinator's core view. |
| P1 | Data from SQL functions or views (not the backend), cached for 5 min. |
| P2 | Employers: response time, offers made, placements, by company. Roles: by category, location, stipend band. |
| P2 | Match quality: the distribution of match scores, % of students with a match ≥ 70%, coverage (today 49%, target 100%). |
| P2 | CSV export of every table; a printable session report. |
| P3 | Placement heatmap (W-11). |
