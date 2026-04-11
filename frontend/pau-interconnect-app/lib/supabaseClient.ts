import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check .env.local file."
  );
}

// Custom fetch wrapper for logging
const supabaseFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    const res = await fetch(input, init);

    if (res.ok) return res;

    const status = res.status || 0;
    let body: string | null = null;
    
    // Only clone and read the body if there's an error to log or check
    if (!res.ok) {
      try {
        body = await res.clone().text();
      } catch (e) {
        body = "<unavailable>";
      }
    }

    const isRefreshTokenError = status === 400 && body?.includes("refresh_token_not_found");

    if (!isRefreshTokenError) {
      const meta = {
        url: String(input),
        status,
        statusText: res.statusText,
        init,
        body,
      };

      if (status >= 500) console.error("[Supabase fetch] Server error", meta);
      else if (status >= 400)
        console.warn("[Supabase fetch] Client auth error (suppressed if refresh token missing)", meta);
    }

    return res;
  } catch (err) {
    console.error("[Supabase fetch] Network error for", String(input), err);
    throw err;
  }
};

// Create the Supabase client using createBrowserClient for consistent SSR handling
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: supabaseFetch },
});

// Optional: Log auth changes for debugging
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    console.debug("[Supabase auth] event:", event, { session });
  });
}
