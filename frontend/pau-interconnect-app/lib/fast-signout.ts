import { supabase } from "@/lib/supabaseClient";

/**
 * Fast client-side sign-out: clear local state immediately, kick off remote cleanup,
 * and navigate without waiting for slower network calls.
 */
export function fastSignOut(redirectTo: string): void {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    // Ignore storage cleanup failures and continue sign-out flow.
  }

  // Fire-and-forget remote cleanup. keepalive helps during navigation.
  void supabase.auth.signOut().catch(() => undefined);
  void fetch("/api/auth/logout", {
    method: "POST",
    keepalive: true,
  }).catch(() => undefined);

  window.location.replace(redirectTo);
}
