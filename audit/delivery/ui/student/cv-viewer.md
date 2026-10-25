# CV viewer `/cv/view`

**File:** `page.tsx` (119 lines)  **Seen:** ✅ error state (light and dark)

## Today
A full page that shows the CV from a signed URL, or "Unable to Display CV · Invalid CV link provided" + Go Back.

## Improvements
| Priority | Change |
|---|---|
| P1 | Turn it into a `Drawer` / modal component used from applicant review and the public profile, so viewing a CV doesn't leave the pipeline. Keep the route for direct links. |
| P1 | An embedded PDF viewer (pdf.js) with zoom, page count and download; it refreshes an expired signed URL automatically (`/api/refresh-cv-url` exists). |
| P2 | Error copy that says what to do: "This link has expired. [Refresh]", or "The student removed their CV". |
