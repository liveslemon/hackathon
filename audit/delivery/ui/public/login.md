# Login pages `/login/student`, `/login/employer`, `/login/admin` (and `/admin`)

**Files:** `app/login/*/page.tsx`, `app/admin/page.tsx`  **Seen:** ✅ student, employer, admin (light and dark)

## Today
A centred card per role: logo, "Welcome Back" / "Employer Portal" / "Admin Portal", email + password, "Forgot password?",
the primary button, "Don't have an account? Sign Up", plus secondary buttons ("Back to Home", "Admin Login" on the
**student** page). `/admin` is a second admin login with a hard-coded allow-list.

## Problems
1. Three nearly identical pages, plus a fourth (`/admin`).
2. The student login advertises **Admin Login**.
3. A student who opens the employer login (or the reverse) gets an error *after* typing their password.
4. No SSO. PAU staff and students already have institutional accounts.
5. Placeholders say `you@example.com`, so students aren't nudged towards their PAU email.

## Redesign
| Priority | Change |
|---|---|
| P0 | Delete `/admin`; redirect to the single sign-in. |
| P1 | **One** `/login` page. Optional role hint from the URL (`/login?as=employer`) changes the copy only. After sign-in, the proxy routes by role (it already does). Keep the old URLs as redirects. |
| P1 | Remove "Admin Login" from public pages. Staff use the same login (their role routes them), protected by MFA. |
| P1 | **"Continue with PAU account"** (Google Workspace or Microsoft Entra, whichever PAU uses), restricted to the PAU domain. That removes passwords for students and staff. Employers keep email + password or a magic link. |
| P2 | A magic-link option ("Email me a sign-in link"). |
| P2 | Inline errors under fields; a "Caps Lock is on" hint; a show-password toggle; `autocomplete="email"` / `current-password`. |
| P2 | After 5 failed attempts, show a CAPTCHA (Supabase supports hCaptcha / Turnstile). |

## Acceptance
- One login route, no admin link in public UI, and a domain-restricted SSO button for PAU.
