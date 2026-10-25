# Onboarding `/onboarding` (and `/onboarding/employer` → redirect)

**File:** `app/onboarding/OnboardingClient.tsx` (~805 lines)  **Seen:** ✅ step 1 (light and dark)

## Today
A two-column card. Left: a vertical stepper (1 Role · 2 Account · 3 Academic · 4 Interests · 5 Complete) with small-caps
sublabels. Right: the step content ("Choose your role": Student / Employer cards), "Having trouble? Get Help", and Next
(disabled until a choice is made). Employers get company fields (name, industry, website, description, culture) in the
account step.

## Problems
1. Account creation (email + password) happens at step 2, *inside* onboarding. If the user drops off later, half-made
   accounts accumulate.
2. No CV step. The single biggest driver of match quality is missing from onboarding.
3. Students aren't asked for matric number, programme or SIWES session, which SIWES needs (03).
4. Employers aren't asked for a CAC number or a work email, which verification needs (P1-4).
5. The step labels use tiny all-caps sublabels ("WHO ARE YOU JOINING AS?"), which are hard to read.

## Redesign
**Students (4 steps, under 3 minutes):**
1. Sign up (PAU SSO, or a PAU email + verify)
2. About you: programme, level, matric no. (optional), graduation year
3. **Upload your CV** → animated parse → confirm the extracted skills (W-2). A "Skip for now" link is allowed but nagged.
4. Interests and preferences (remote/on-site, location, stipend expectations) → "See my matches"

**Employers (3 steps):**
1. Sign up with a work email
2. Company: name, website, CAC RC no., industry, logo
3. "Verification pending" screen: what happens next, a typical wait time, and "Draft your first posting while you wait".

| Priority | Change |
|---|---|
| P1 | Put the CV upload in student onboarding with auto-fill (W-2). |
| P1 | Collect what verification and SIWES need (CAC no., matric no., programme). |
| P2 | Show a progress bar + "about 2 min left"; save each step server-side so a refresh resumes it (it partly does). |
| P2 | Sentence-case step labels; larger touch targets; keyboard Enter = Next. |
| P3 | The final step celebrates: "You're matched with 7 roles." It lands on the dashboard with the coach card (W-1). |
