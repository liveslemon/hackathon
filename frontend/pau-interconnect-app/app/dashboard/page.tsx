import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import DashboardClient from "./DashboardClient";
import crossFetch from "cross-fetch";

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: crossFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return <DashboardClient session={session} />;
}
