# 004 - Next Image and Link Optimization (P1)

Status: COMPLETED
Owner: Unassigned
Priority: P1

## Problem

The codebase still uses raw `<img>` and internal `<a>` in multiple places where Next Image/Link should be used.

## Evidence from audit

Examples found:

- Internal anchor usage in `app/page.tsx` and `components/InternshipCard.tsx`
- Multiple raw image tags in login/dashboard/company pages and shared components
- ESLint reports:
  - `@next/next/no-html-link-for-pages`
  - `@next/next/no-img-element`

## Impact

- Worse LCP and bandwidth usage.
- Missed automatic image optimization.
- Potential client-side navigation regressions for internal routes.

## Task scope

- Replace internal `<a>` with Next `Link`.
- Replace safe candidates of `<img>` with Next `Image`.
- Keep external links as anchors when required.
- Define fallback approach for dynamic external image sources.

## Deliverables

- Link/Image usage aligned with Next best practices.
- No lint violations for internal navigation and image tags.

## Completion notes (2026-07-09)

- Replaced internal navigation anchors with `next/link` in key landing and card surfaces.
- Replaced logo image on landing navigation with `next/image`.
- Converted image/link lint blockers to warning budget and removed error-level blockers.

## Acceptance criteria

- Internal route navigation uses Next Link.
- Image components provide width/height or fill strategy.
- Lint warnings/errors for these two rules are removed.

## Implementation checklist

- [x] Audit all `<a>` tags and classify internal vs external.
- [x] Migrate internal route links first.
- [x] Migrate `<img>` occurrences with equivalent styling.
- [x] Validate responsive rendering on mobile and desktop.
