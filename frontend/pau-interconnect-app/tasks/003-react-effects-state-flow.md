# 003 - Fix React Effect and State Flow Issues (P0)

Status: COMPLETED
Owner: Unassigned
Priority: P0

## Problem

Several components contain effect patterns that can cause stale closures, excessive rerenders, or non-deterministic UI updates.

## Evidence from audit

- `app/dashboard/student/Dashboard.tsx`
  - Event listener effect references `refreshData` before declaration.
  - Missing dependencies warning in effect using `refreshData`.
- `components/InternshipGrid.tsx`
  - Synchronous `setState` inside effects flagged by `react-hooks/set-state-in-effect`.
  - Filtering pipeline triggers repeated state updates.

## Impact

- Potential stale data in event-driven refresh logic.
- Hard-to-debug rerender loops and performance regressions.
- Lower confidence in filter/search behavior consistency.

## Task scope

- Refactor effect logic to avoid unstable references.
- Memoize computed filtered data where possible.
- Keep effects focused on subscriptions/sync boundaries.
- Move derivations into memoized selectors instead of effect-driven setState.

## Deliverables

- Stable callbacks for event listeners.
- Cleaner filtering pipeline with predictable state transitions.
- Hook rule compliance in dashboard and internship grid surfaces.

## Completion notes (2026-07-09)

- Refactored `components/InternshipGrid.tsx` to use `useMemo` for derived filtering logic.
- Removed effect-driven derived `setState` pipeline and stabilized pagination updates.
- Refactored `app/dashboard/student/Dashboard.tsx` to memoize `refreshData` and fix stale callback dependency behavior.

## Acceptance criteria

- No hook rule errors in affected files.
- Filter and search UX behavior remains unchanged functionally.
- No redundant rerender spikes during rapid filter changes.

## Implementation checklist

- [x] Convert listener callbacks to stable memoized handlers.
- [x] Replace derived `setState` chains with `useMemo` where appropriate.
- [x] Ensure effect dependency arrays are complete and intentional.
- [x] Add targeted component tests for filter/search consistency.
