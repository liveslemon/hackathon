import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check .env.local file.",
  );
}

// Wrap the global fetch to log network errors and non-OK responses originating
// from Supabase requests. This helps when debugging "failed to fetch" or
// unexpected HTTP status codes.
const supabaseFetch = async (input, init) => {
  try {
    const res = await fetch(input, init);

    // Do not log successful 2xx responses to avoid noisy output.
    if (res.ok) return res;

    // For non-OK responses, categorize logging level:
    // - 4xx: likely client/auth/RLS issue — log as warning with context
    // - 5xx+: server error — log as error and include body when possible
    const status = res.status || 0;
    let body = null;
    try {
      body = await res.clone().text();
    } catch (e) {
      body = "<unavailable>";
    }

    const meta = {
      url: String(input),
      status,
      statusText: res.statusText,
      init,
      body,
    };

    if (status >= 500) {
      console.error("[Supabase fetch] Server error", meta);
    } else if (status >= 400) {
      // Use console.warn for client/auth errors to make them easier to triage
      console.warn("[Supabase fetch] Client error (possible auth/RLS)", meta);
    } else {
      // Fallback to debug for anything else
      console.debug("[Supabase fetch] Unexpected response", meta);
    }

    return res;
  } catch (err) {
    console.error("[Supabase fetch] Network error for", String(input), err);
    throw err;
  }
};

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: supabaseFetch,
  },
});

// Log auth state changes to help trace signup/signin flows.
supabase.auth.onAuthStateChange((event, session) => {
  console.debug("[Supabase auth] event:", event, { session });
});
