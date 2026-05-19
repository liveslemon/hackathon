import { createBrowserClient } from "@supabase/ssr";
import { supabaseFetch } from "./supabase-fetch";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check .env.local file."
  );
}

// Create the Supabase client using createBrowserClient for consistent SSR handling
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  global: { 
    // Use custom fetch for error suppression only on server; native fetch is safer in browser
    fetch: typeof window === 'undefined' ? supabaseFetch : fetch 
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Disable broadcast and provide a no-op lock function to prevent session interference between tabs
    broadcast: false,
    lock: (name, acquireTimeout, callback) => callback(),
  }
});

// Debug listener removed to avoid session lock conflicts with AuthProvider.
