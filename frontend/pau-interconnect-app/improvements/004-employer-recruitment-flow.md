# Employer Recruitment Flow

## Current Walkthrough

1. Employer logs in via `/login/employer`.
2. Employer lands on dashboard overview with:
   - active postings count
   - applicant activity
   - pending logbook reviews
3. Employer navigates to posting list and specific internship applicants.
4. Employer reviews candidates and logbook entries.

## Slip-ups Observed

1. "Add Posting" quick action currently points to `#` and does not consistently trigger a real action.
2. Some data joins rely on broad `select("*")`, increasing payload risk and schema coupling.
3. Candidate review surfaces rely on mixed inline logic and limited decision audit trail.
4. Role checks are present, but some redirects are broad and can be confusing.

## Improvement Plan

### A. Complete action wiring

- Convert quick actions into deterministic routes or modal triggers.
- Add accessibility labels and analytics events for each action.

### B. Tighten data contracts

- Replace broad wildcard selects with explicit field lists.
- Add typed DTOs for applicants, postings, and review actions.

### C. Improve applicant decision workflow

- Add review reason templates + optional custom notes.
- Persist decision audit (`who`, `when`, `why`) for each applicant action.

### D. Better route/permission feedback

- Replace silent/broad redirects with explicit unauthorized view + next steps.

## Acceptance Criteria

1. Every employer dashboard action has a working deterministic destination.
2. Employer data fetches avoid wildcard select patterns.
3. Applicant review decisions are auditable and reversible by policy.
4. Unauthorized states are explicit and user-understandable.

## Priority

- Priority: High
- Impact: High
- Effort: Medium
