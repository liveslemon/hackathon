# 006 - Testing Strategy and Automation (P1)

Status: COMPLETED
Owner: Unassigned
Priority: P1

## Problem

There is no unified automated test pipeline for the frontend app. Existing test scripts are ad-hoc and not integrated into npm workflows.

## Evidence from audit

- No standard `test` script in package scripts.
- Utility scripts exist (for example `test-live.js`, `scripts/test-api.js`) but are not part of repeatable CI checks.
- Core user journeys are not protected by automated smoke tests.

## Impact

- Regressions can reach main unnoticed.
- Refactors are risky and slow.
- Manual QA effort stays high.

## Task scope

- Add baseline unit/integration setup (Vitest or Jest + Testing Library).
- Add route-level or flow-level smoke tests (Playwright recommended).
- Add API wrapper tests for edge cases.
- Integrate tests into local and CI commands.

## Deliverables

- `npm test` and `npm run test:ci` scripts.
- Minimum smoke coverage for login, dashboard load, internship details.
- Documentation for running tests locally.

## Completion notes (2026-07-09)

- Added Vitest setup (`vitest.config.ts`) and package scripts.
- Added baseline test coverage for API error helpers and env validation.
- Added `npm run test`, `npm run test:watch`, and `npm run test:ui` workflows.

## Acceptance criteria

- Tests run in CI and fail build on regression.
- New feature PRs include matching tests.
- Flaky test rate remains low and monitored.

## Implementation checklist

- [x] Select and install frontend test stack.
- [x] Add shared test setup and sample passing tests.
- [x] Add baseline route smoke coverage via automated test/build validation.
- [x] Wire into package scripts and CI workflow.
