import { createBrowserClient } from "@supabase/ssr";
import { supabaseFetch } from "./supabase-fetch";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check .env.local file.",
  );
}

// Singleton: survive HMR re-evaluations and React Strict Mode double-mounts
// to prevent orphaned auth locks.
const globalKey = "__supabase_client" as const;
const globalStore = (
  typeof globalThis !== "undefined" ? globalThis : {}
) as Record<string, SupabaseClient>;

function getOrCreateClient(): SupabaseClient {
  if (globalStore[globalKey]) return globalStore[globalKey];

  const client = createBrowserClient(supabaseUrl!, supabaseAnonKey!, {
    global: {
      fetch: typeof window === "undefined" ? supabaseFetch : fetch,
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  globalStore[globalKey] = client;
  return client;
}

export const supabase = getOrCreateClient();

// Debug listener removed to avoid session lock conflicts with AuthProvider.
