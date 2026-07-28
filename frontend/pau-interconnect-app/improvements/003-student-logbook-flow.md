# Student Logbook Flow

## Current Walkthrough

1. Student opens logbook page.
2. Server preloads accepted internship relation and session data.
3. Client loads logbook history and determines employer linkage.
4. Student drafts entry, optionally AI-enhances text, submits.
5. Student can print/export logbook from print page.

## Slip-ups Observed

1. Logbook page currently passes minimal profile context (`initialProfile: null`) and relies heavily on client fallback logic.
2. Several branches silently fail with console errors but weak user feedback.
3. AI enhance + submit are separate async operations without robust request correlation.
4. Print/export behavior is UI-only and lacks explicit audit or export metadata.

## Improvement Plan

### A. Improve server preload contract

- Always preload student profile ID and accepted internship summary server-side.
- Fail early with explicit page-level state when prerequisites are missing.

### B. Harden write operations

- Add idempotency key for submit endpoint.
- Add optimistic update rollback strategy on failed writes.

### C. Add explicit user feedback states

- Replace silent console-only failures with toasts/inline status cards.
- Include retry affordances for history refresh, enhance, and submit.

### D. Formalize export behavior

- Add server-generated PDF export endpoint (or signed export snapshot).
- Include generated timestamp and source record count.

## Acceptance Criteria

1. Logbook page can render deterministically without auth/profile race conditions.
2. Submit/enhance failures are visible and actionable in UI.
3. Duplicate submissions are prevented by server idempotency.
4. Export output is reproducible and traceable.

## Priority

- Priority: High
- Impact: High
- Effort: Medium
