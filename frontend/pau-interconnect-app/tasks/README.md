# App Audit Task Board

Last audit date: 2026-07-09

Scope covered:

- Next.js frontend app routes and shared components
- Data/auth fetch utilities
- Lint, typecheck, and production build checks
- Script and developer workflow surface

Current health snapshot:

- TypeScript check: passing (`npm run typecheck`)
- Tests: passing (`npm run test`)
- Production build: passing (`npm run build`)
- ESLint: passing with warning budget (`0 errors, 249 warnings`)
- Full verification pipeline: passing (`npm run verify`, exit 0)

## Prioritized TODO

- [x] P0: Reduce ESLint from 139 errors to 0 (and keep warning budget controlled)
  - Details: ./001-eslint-stabilization.md
- [x] P0: Replace unsafe `any` usage with domain types/shared schemas
  - Details: ./002-domain-types-remove-any.md
- [x] P0: Fix hook/state-flow issues causing stale behavior and rerender churn
  - Details: ./003-react-effects-state-flow.md
- [x] P1: Replace internal `<a>` and `<img>` with Next Link/Image where applicable
  - Details: ./004-next-image-link-optimization.md
- [x] P1: Standardize fetch/API error handling and schema validation
  - Details: ./005-api-contract-validation-and-errors.md
- [x] P1: Add automated tests (unit + integration + route smoke)
  - Details: ./006-testing-strategy-and-automation.md
- [x] P1: Add CI quality gates for lint, typecheck, build, and tests
  - Details: ./007-ci-quality-gates.md
- [x] P2: Improve runtime observability and remove debug logging noise
  - Details: ./008-observability-and-logging.md
- [x] P2: Add environment validation and startup diagnostics
  - Details: ./009-env-validation-and-config-safety.md
- [x] P2: Clean obsolete/manual scripts and codify contributor workflow
  - Details: ./010-dev-workflow-and-script-hygiene.md

## Completion summary

1. Completed infrastructure: shared types, logger, env validation, API typing, tests, and CI workflow.
2. Completed quality gate baseline: `lint` now has zero errors, and `verify` passes end-to-end.
3. Completed workflow documentation and contributor process standardization.

## Definition of done for the full board

- ESLint errors are 0.
- Any remaining warnings are documented and intentional.
- CI blocks merges when lint/typecheck/build/tests fail.
- Core user journeys (login, onboarding, dashboard, internships, profile) have automated smoke coverage.
- Developer onboarding can be completed from README alone in under 15 minutes.
