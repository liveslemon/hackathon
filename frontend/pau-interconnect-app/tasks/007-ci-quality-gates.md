# 007 - CI Quality Gates (P1)

Status: COMPLETED
Owner: Unassigned
Priority: P1

## Problem

Quality checks are not codified as mandatory merge gates yet.

## Evidence from audit

- Lint currently fails locally, but there is no enforced gate documented in repository workflows.
- Typecheck/build can pass while lint quality remains degraded.

## Impact

- Main branch can accumulate technical debt quickly.
- Engineering velocity drops over time from unstable baseline.

## Task scope

- Add CI workflow to run lint, typecheck, build, and tests.
- Configure fail-fast policy for pull requests.
- Publish status badges and required check policy.

## Deliverables

- GitHub Actions pipeline (or equivalent) for PR and main branch.
- Branch protection rules documented.
- Optional cache optimization for dependency installs.

## Completion notes (2026-07-09)

- Added GitHub Actions workflow in `.github/workflows/ci.yml`.
- CI now runs: env check, lint, typecheck, tests, and build.
- Added local parity command `npm run verify` for pre-PR checks.
- Remaining manual step: enable required branch protection checks in GitHub repository settings.

## Acceptance criteria

- PR cannot merge if any required check fails.
- CI runtime stays within acceptable budget.
- Contributors can reproduce CI locally with a single command.

## Implementation checklist

- [x] Create CI workflow YAML.
- [x] Add scripts: lint, typecheck, build, test:ci.
- [ ] Enable required checks in repository settings. (manual GitHub setting)
- [x] Document troubleshooting for common CI failures.
