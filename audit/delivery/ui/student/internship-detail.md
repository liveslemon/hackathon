# Internship detail `/internships/[id]`

**Files:** `page.tsx`, `InternshipClientParts.tsx` (1,037 lines)  **Seen:** code 🔎 (mock mode returns 404 for sample IDs)

## Today
Header with the role and company, match score (agent 11's `MatchScore`, with the instant explanation and an "AI summary"
≥ 80%), "About the role", "Requirements", "What you'll do", an apply flow with a streaming AI cover letter, and a
`window.confirm` before submitting.

## Improvements
| Priority | Change |
|---|---|
| P1 | **Two-column layout ≥ 1024 px:** content on the left; a sticky right panel with the match ring, deadline countdown, key facts (mode, location, duration, stipend, slots left) and the primary **Apply** button. On mobile, a sticky bottom bar with Apply. |
| P1 | The apply flow becomes a **3-step sheet** (`Drawer`): 1. Review what's shared (profile, CV, contact) → 2. Cover letter (Generate with AI · Write my own · Skip), with an editable result → 3. Confirm & send. Replace `window.confirm`. |
| P1 | Show **why you match** (W-4): matched skills ✓, missing skills, and "Improve this match" linking to the profile section or a skill-gap run for this role. |
| P1 | Clear states: already applied (show status + withdraw), deadline passed, no CV, profile incomplete. Each has the exact action to fix it. |
| P2 | About the company: logo, verified badge, a short description, other open roles, "Follow". |
| P2 | Similar roles (top 3 by the student's match). |
| P2 | Share link + copy-to-clipboard; OpenGraph tags for a role card when shared on WhatsApp (the main channel for students). |
| P3 | "Interview prep pack" once shortlisted (W-12). |

## Acceptance
- Apply works on a 360 px screen with one thumb; no browser dialogs.
- The match % here equals the one on the card and the one the employer sees (canonical `match_results`; agent 11 fixed this).
