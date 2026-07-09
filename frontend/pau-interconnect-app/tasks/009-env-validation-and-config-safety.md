# 009 - Environment Validation and Config Safety (P2)

Status: COMPLETED
Owner: Unassigned
Priority: P2

## Problem

Configuration values are read directly in many places, often with non-null assertions and without startup validation.

## Evidence from audit

- Server/client utilities rely on environment values being present.
- Missing or malformed values may only fail at runtime under specific flows.

## Impact

- Late failures in development, staging, or production.
- Slower onboarding when required variables are unclear.

## Task scope

- Add centralized environment schema validation at startup.
- Provide explicit error messages for missing values.
- Split client-safe and server-only env contracts.

## Deliverables

- `env` module with typed accessors.
- Startup validation for required variables.
- Updated documentation for env setup.

## Completion notes (2026-07-09)

- Added centralized env module in `lib/env.ts`.
- Added startup-style env validation helper and backend URL resolver.
- Added `npm run check:env` and `scripts/health/check-env.mjs` for contributor diagnostics.

## Acceptance criteria

- App fails fast with actionable messages if env is invalid.
- No direct ad-hoc env access in feature modules.
- Team onboarding can validate env setup in one command.

## Implementation checklist

- [x] Define schema for required variables.
- [x] Refactor modules to consume typed env accessors.
- [x] Add command or script for env diagnostics.
- [x] Update README with exact variable contract.
