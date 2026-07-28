import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseFetch } from "@/lib/supabase-fetch";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const preferredRole = role === "employer" || role === "student" ? role : null;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: supabaseFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is already signed in, check if they already completed onboarding.
  // If so, redirect to their dashboard instead of showing the form again.
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, onboarding_stage")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.onboarding_stage === "completed" && profile.role) {
      redirect(
        profile.role === "employer"
          ? "/dashboard/employer"
          : "/dashboard/student",
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-start justify-center py-10 px-4 overflow-y-auto">
      <OnboardingClient
        initialUser={user}
        initialRolePreference={preferredRole}
      />
    </div>
  );
}
