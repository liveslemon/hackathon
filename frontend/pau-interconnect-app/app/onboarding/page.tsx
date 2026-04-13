import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crossFetch from "cross-fetch";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: crossFetch },
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {}
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-white md:bg-gradient-to-br md:from-brand md:to-brand-secondary flex items-center justify-center md:p-6 overflow-y-auto">
      <OnboardingClient initialUser={user} />
    </div>
  );
}
