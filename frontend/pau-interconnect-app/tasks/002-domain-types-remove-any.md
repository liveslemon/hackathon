# 002 - Replace any With Domain Types (P0)

Status: COMPLETED
Owner: Unassigned
Priority: P0

## Problem

There is widespread `any` usage across app, components, context, and API utility files. This bypasses compile-time safety and makes refactors risky.

## Evidence from audit

Examples of flagged files include:

- `app/dashboard/student/*`
- `app/profile/ProfileClient.tsx`
- `app/internships/[id]/*`
- `components/InternshipGrid.tsx`
- `lib/api.ts`
- `lib/api-server.ts`
- `context/AuthContext.tsx`

## Impact

- Runtime type mismatches are more likely.
- APIs and DB response shapes are implicit and duplicated.
- Autocomplete and editor guidance are weaker.

## Task scope

- Introduce central domain models for:
  - Profile
  - Internship
  - Application status
  - Logbook entry
  - API error payload
- Replace `any` with explicit interfaces/types and narrow unions.
- Add runtime guards for unknown external payloads.

## Deliverables

- Shared type module (or modules) used by app + components + lib.
- Significant reduction in `no-explicit-any` violations.
- Safer API wrappers using typed responses.

## Completion notes (2026-07-09)

- Added shared domain types in `types/domain.ts`.
- Added shared API error/contract typing in `types/api.ts`.
- Updated client/server API wrappers to typed generic signatures.
- Refactored key dashboard/profile flows to consume typed API payloads.

## Acceptance criteria

- `@typescript-eslint/no-explicit-any` no longer errors in audited files.
- Complex API responses are parsed into typed objects.
- Type definitions are reused instead of duplicated.

## Implementation checklist

- [x] Add `types/` or equivalent shared type directory.
- [x] Define core entities and response contracts.
- [x] Refactor dashboard and profile surfaces to consume shared types.
- [x] Refactor `lib/api.ts` and `lib/api-server.ts` signatures.
- [x] Add lightweight parser/validator helpers for unsafe payloads.
