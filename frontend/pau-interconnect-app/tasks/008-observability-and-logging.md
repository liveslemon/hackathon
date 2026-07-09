# 008 - Observability and Logging Cleanup (P2)

Status: COMPLETED
Owner: Unassigned
Priority: P2

## Problem

Debug logging is mixed into production paths and there is no structured observability baseline.

## Evidence from audit

- `lib/api.ts` logs auth/session flow details directly via console calls.
- Error reporting is mostly console-based, with no common telemetry hook.

## Impact

- Noisy logs reduce signal quality during debugging.
- Hard to correlate client errors with backend incidents.

## Task scope

- Introduce environment-aware logger utility.
- Replace raw console statements in shared utility modules.
- Add error boundary/event hooks for critical route failures.

## Deliverables

- Standard logger interface with levels.
- Production-safe logging defaults.
- Optional telemetry integration plan (Sentry or equivalent).

## Completion notes (2026-07-09)

- Added shared logger utility in `lib/logger.ts`.
- Replaced debug/error console calls in API utility layer with logger methods.
- Reduced noisy debug output in shared fetch pipeline and standardized log prefixes.

## Acceptance criteria

- Shared modules do not emit verbose debug logs in production.
- Error context is standardized across client/server utilities.
- Incident triage can trace request failures with minimal manual effort.

## Implementation checklist

- [x] Add logger utility and migration guideline.
- [x] Refactor `lib/api.ts` and related modules to use logger.
- [x] Add top-level error boundary instrumentation.
- [x] Document log levels and usage policy.
