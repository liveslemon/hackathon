// lib/supabaseClient.ts
"use client"; // ensures this runs in the browser

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check .env.local file."
  );
}

// Custom fetch wrapper for logging
const supabaseFetch = async (input: RequestInfo, init?: RequestInit) => {
  try {
    const res = await fetch(input, init);

    if (res.ok) return res;

    const status = res.status || 0;
    let body: string | null = null;
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

    if (status >= 500) console.error("[Supabase fetch] Server error", meta);
    else if (status >= 400)
      console.warn("[Supabase fetch] Client error (possible auth/RLS)", meta);
    else console.debug("[Supabase fetch] Unexpected response", meta);

    return res;
  } catch (err) {
    console.error("[Supabase fetch] Network error for", String(input), err);
    throw err;
  }
};

// Create the Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: supabaseFetch },
});

// Optional: Log auth changes for debugging
supabase.auth.onAuthStateChange((event, session) => {
  console.debug("[Supabase auth] event:", event, { session });
});
