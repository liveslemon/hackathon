# Logbook print `/dashboard/student/logbook/print`

**File:** `page.tsx` (431 lines)  **Seen:** code 🔎

## Today
"Students Industrial Work Experience Scheme · Official SIWES Daily Training Logbook", grouped entries, and a print stylesheet
that forces white paper.

## Improvements
| Priority | Change |
|---|---|
| P1 | **Generate a PDF server-side** (React-PDF or Playwright print in the worker) instead of relying on the browser's print. You get a consistent layout, page numbers, and the same file for the coordinator. |
| P1 | Match the ITF/SIWES layout PAU actually uses: a cover page (student, matric no., programme, company, supervisors, dates), a weekly table (day, activities, hours), and a weekly signature block per supervisor with a date (F-8). |
| P2 | A QR code on every page linking to `/verify/<code>`, showing the signed weeks are genuine (W-8). |
| P2 | Watermark "DRAFT" until all weeks are signed. |
