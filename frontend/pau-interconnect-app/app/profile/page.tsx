import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";
import DashboardShell from "@/components/DashboardShell";
import { supabaseFetch } from "@/lib/supabase-fetch";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: supabaseFetch },
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {}
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login/student");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const isEmployer = profile?.role === "employer";

  return (
    <DashboardShell userProfile={profile}>
      <div className="max-w-4xl mx-auto pb-12">
        <header className="mb-8 px-4 sm:px-0">
          <h2 className="text-2xl font-bold text-slate-800 leading-tight">
            {isEmployer ? "Company Profile" : "Profile Settings"}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isEmployer 
              ? "Manage your company information and brand identity" 
              : "Manage your personal information, interests, and CV"}
          </p>
        </header>

        <div className="px-4 sm:px-0">
          <ProfileClient initialProfile={profile} userEmail={user.email ?? null} />
        </div>
      </div>
    </DashboardShell>
  );
}
