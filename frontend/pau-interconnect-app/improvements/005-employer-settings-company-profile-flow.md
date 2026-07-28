# Employer Settings + Company Profile Flow

## Current Walkthrough

1. Employer opens settings page.
2. Employer updates website/industry/description/culture.
3. Employer uploads logo/banner via Supabase storage.
4. Employer saves profile updates.

## Slip-ups Observed

1. Asset upload and profile save are split operations; users can upload but forget to save metadata.
2. URL and content validations are basic and mostly client-side.
3. No explicit image processing constraints (dimensions/aspect guidance).
4. API base and environment handling can diverge between local/prod contexts.

## Improvement Plan

### A. Make save flow atomic from user perspective

- Stage uploads and bind them to a draft model.
- Commit all changes in one submit flow with final confirmation state.

### B. Add server-side validation

- Validate URLs, field lengths, and sanitization in backend endpoint.
- Return field-level structured error payload.

### C. Add media constraints and previews

- Enforce allowed aspect ratio windows and file dimensions.
- Show explicit validation hints before upload.

### D. Add change history

- Keep simple revision metadata for company profile changes.

## Acceptance Criteria

1. Upload + profile save flow cannot leave orphaned unsaved visual assets.
2. Validation errors are field-specific and identical across client/server.
3. Logo/banner requirements are visible and enforced.
4. Profile updates are traceable by timestamp/user.

## Priority

- Priority: Medium
- Impact: High
- Effort: Medium
