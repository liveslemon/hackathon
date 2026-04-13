import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crossFetch from "cross-fetch";
import ProfileClient from "./ProfileClient";
import DashboardShell from "@/components/DashboardShell";
import { Typography } from "@/components/ui";

export default async function ProfilePage() {
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

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login/student");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  const isEmployer = profile?.role === "employer";

  return (
    <DashboardShell userProfile={profile}>
      <div className="max-w-4xl mx-auto pb-12">
        <header className="mb-10 px-4 sm:px-0">
          <Typography variant="h3" weight="bold" className="text-slate-900 leading-tight">
            {isEmployer ? "Company Profile" : "Profile Settings"}
          </Typography>
          <Typography variant="caption" className="text-slate-400 font-medium tracking-wide">
            {isEmployer 
              ? "Manage your company information, brand identity, and recruitment settings" 
              : "Manage your personal information, interests, and school details"}
          </Typography>
        </header>

        <div className="px-4 sm:px-0">
          <ProfileClient initialProfile={profile} userEmail={session.user.email ?? null} />
        </div>
      </div>
    </DashboardShell>
  );
}
