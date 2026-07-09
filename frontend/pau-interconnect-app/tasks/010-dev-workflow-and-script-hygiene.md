# 010 - Developer Workflow and Script Hygiene (P2)

Status: COMPLETED
Owner: Unassigned
Priority: P2

## Problem

There are loose utility/test scripts in the repository root and no single documented workflow for contributors.

## Evidence from audit

- Root-level ad-hoc scripts exist (for example `test-live.js`, `test_db.py`, `create_cv.py`).
- Scripts are not grouped by purpose or integrated into package scripts.
- Contributor workflow is partially documented and not fully automation-first.

## Impact

- New contributors spend extra time discovering how to verify changes.
- Script sprawl increases accidental misuse risk.
- Manual steps are repeated and inconsistently executed.

## Task scope

- Reorganize utility scripts into purpose-based folders.
- Expose standardized npm scripts for common developer tasks.
- Add contributor runbook for local setup, checks, and release-ready validation.

## Deliverables

- Cleaner script layout and naming conventions.
- Expanded `package.json` scripts (typecheck, test, verify, clean, db-check if needed).
- Contributor-focused docs in README or CONTRIBUTING.

## Completion notes (2026-07-09)

- Added standardized quality scripts in `package.json` (`typecheck`, `test`, `verify`, `check:env`).
- Added contributor runbook in `CONTRIBUTING.md`.
- Added health-script location under `scripts/health/` and integrated it into local/CI workflows.

## Acceptance criteria

- One command exists for full local verification.
- Script ownership/purpose is documented.
- Obsolete scripts are archived or removed.

## Implementation checklist

- [x] Inventory current scripts and assign purpose.
- [x] Move scripts into `scripts/` subfolders by domain.
- [x] Add npm aliases for common tasks.
- [x] Add CONTRIBUTING guide with expected workflow.
