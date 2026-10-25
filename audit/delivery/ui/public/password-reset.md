# Password reset `/login/forgot-password`, `/login/reset-password`

**Seen:** ✅ both (light and dark)

## Today
- Forgot: "Reset Password", an email field, "Send Reset Link".
- Reset: "Set New Password", two password fields, "Update Password".

## Improvements
| Priority | Change |
|---|---|
| ✅ | It already shows a neutral message after "Send" ("If an account exists for that email…"), so it doesn't reveal which emails are registered. Keep it. |
| P1 | A password strength meter + the rules shown live (length ≥ 10, not a common password), matching the Supabase settings (P0-3). |
| P2 | Handle an expired or used link with a clear state + a "Send a new link" button (instead of a generic error). |
| P2 | On success, sign the user in and route them by role, with a toast ("Password updated"). |
