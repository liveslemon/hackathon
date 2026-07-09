# 005 - API Contract Validation and Error Handling (P1)

Status: COMPLETED
Owner: Unassigned
Priority: P1

## Problem

API wrappers currently rely on loosely typed payloads and ad-hoc error handling, which can hide backend contract drifts.

## Evidence from audit

- `lib/api.ts` and `lib/api-server.ts` use broad signatures and `any` in error paths.
- Response parsing assumes JSON payload shape in many flows.
- Error surfaces are inconsistent across UI features.

## Impact

- Harder debugging when backend responses change.
- Inconsistent user feedback for failures.
- Increased chance of runtime crashes from malformed payloads.

## Task scope

- Define canonical API response and error types.
- Add schema validation for critical responses (for example with zod).
- Normalize error mapping into user-friendly and developer-friendly layers.
- Ensure timeout and retry behavior is documented and test-covered.

## Deliverables

- Typed API client interfaces for client/server fetch wrappers.
- Shared error object contract consumed by UI.
- Validation applied to high-risk endpoints first.

## Completion notes (2026-07-09)

- Added `ApiError` contract and message normalization helpers in `types/api.ts`.
- Updated `lib/api.ts` and `lib/api-server.ts` to typed generic wrappers.
- Standardized timeout/retry failure mapping and server/client error handling paths.
- Updated affected consumers to typed fetch payloads.

## Acceptance criteria

- Critical fetch calls fail gracefully with predictable error shapes.
- Runtime schema mismatch is reported explicitly.
- API utility modules are free from `any` errors.

## Implementation checklist

- [x] Create shared response/error schemas.
- [x] Refactor API wrappers to generic typed functions.
- [x] Add endpoint-level parsing for dashboard/profile workflows.
- [x] Add tests for timeout, non-JSON, and 4xx/5xx branches.
