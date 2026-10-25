# Employer analytics `/dashboard/employer/analytics` (and `/dashboard/analytics` → redirect)

**Files:** `page.tsx`, `AnalyticsClient.tsx` (~500 lines)  **Seen:** code 🔎

## Today
"Recruitment Analytics": Total Impressions, Candidate Applications, Placement Rate, Average Match Score; "Applicant
Velocity (Last 14 Days)"; "Recruitment Pipeline Funnel"; "Role Performance Breakdown"; empty state "No recruitment data
yet" + Post First Internship; Export Reports.

## Improvements
| Priority | Change |
|---|---|
| P1 | A date range selector (7 d / 30 d / session / custom) that drives every chart. |
| P1 | Define every metric in a tooltip ("Placement rate = offers accepted ÷ applicants"). Today "Placement Rate" and the dashboard's "Acceptance Rate" overlap. |
| P1 | Charts use the chart tokens from the design system in both themes (verify the axes, gridlines and tooltips). |
| P2 | Time-to-hire per role; source of applicants (match feed vs search vs shared link). |
| P2 | Export: CSV per chart; a PDF summary for HR. |
| P3 | Benchmarks against anonymised platform medians ("Your response time: 6 d · platform: 4 d"). |
