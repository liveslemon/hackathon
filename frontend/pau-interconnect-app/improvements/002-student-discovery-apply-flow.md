# Student Discovery + Apply Flow

## Current Walkthrough

1. Student enters dashboard and sees internship grid + quick filters.
2. Grid is filtered by interests/status/match/search.
3. Student opens internship details page.
4. Student views score, requirements, responsibilities, and apply action.
5. Student tracks applications in `My Internships`.

## Slip-ups Observed

1. Dashboard filtering logic is complex and repeated across multiple components.
2. Matching score and application status come from merged client/server data with weak contract guarantees.
3. Empty/error states differ per page and can feel inconsistent.
4. Some UX actions rely on hard refresh-style behavior in related flows.

## Improvement Plan

### A. Centralize student internship query model

- Define one typed query contract for internship list + match + status.
- Move merge logic to backend endpoint or shared server utility.

### B. Unify filter/query state

- Use URL query params for filter/search/sort/page to support:
  - deep links
  - shareable views
  - browser back/forward behavior

### C. Standardize apply state transitions

- Explicit statuses and transition guards:
  - `none -> applied -> accepted/rejected`
- Prevent duplicate submissions and race conditions.

### D. Improve empty and edge states

- Provide explicit UI variants:
  - no internships
  - no matches
  - network errors
  - expired deadlines

## Acceptance Criteria

1. Internship list data is sourced from one canonical typed contract.
2. Filter state is reflected in URL and survives refresh.
3. Apply button behavior is idempotent and status-aware.
4. Every no-data/error branch has a designed UI with recovery action.

## Priority

- Priority: High
- Impact: High
- Effort: Medium
