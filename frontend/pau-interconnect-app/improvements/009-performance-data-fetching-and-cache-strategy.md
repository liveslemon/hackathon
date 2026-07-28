# Performance, Data Fetching, and Cache Strategy

## Current Walkthrough

1. Multiple server components fetch auth/profile repeatedly.
2. Some pages use `revalidate = 0` broadly.
3. Client views can trigger follow-up fetches after initial server render.
4. Large list/table views can grow without clear pagination/virtualization strategy.

## Slip-ups Observed

1. Repeated profile queries across related route segments.
2. Fully uncached pages may increase latency and backend load.
3. Data payloads in some views are larger than needed.
4. Progressive loading strategy is inconsistent across pages.

## Improvement Plan

### A. Consolidate shared fetches

- Introduce route-level loader helpers to fetch auth/profile once per request path.

### B. Define cache policy matrix

- Per endpoint/page define:
  - `no-store`
  - short revalidate window
  - static with revalidation

### C. Reduce payload size

- Explicit field selections and pagination defaults for list-heavy endpoints.

### D. Optimize rendering path

- Keep skeleton + suspense for first paint but cap nested waterfall fetches.

## Acceptance Criteria

1. Duplicate auth/profile fetches are reduced in primary flows.
2. Each major route has an intentional documented cache policy.
3. List endpoints use pagination and explicit select fields.
4. Initial page render remains responsive under realistic data volume.

## Priority

- Priority: Medium
- Impact: Medium-High
- Effort: Medium
