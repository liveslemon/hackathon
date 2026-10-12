import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";
import DashboardShell from "@/components/DashboardShell";
import { PageHeader } from "@/components/ui";
import { supabaseFetch } from "@/lib/supabase-fetch";

export default async function ProfilePage() {
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
  if (!user) redirect("/login/student");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "employer") {
    redirect("/dashboard/employer/settings");
  }
  if (profile?.role === "admin" || profile?.is_admin) {
    redirect("/dashboard/admin");
  }

  return (
    <DashboardShell userProfile={profile}>
      <div className="max-w-4xl mx-auto pb-12 px-4 sm:px-0">
        <PageHeader
          title="Profile & Skills"
          description="Manage your personal background, academic records, verified skills, and experience."
          className="mb-8"
        />

        <ProfileClient
          initialProfile={profile}
          userEmail={user.email ?? null}
        />
      </div>
    </DashboardShell>
  );
}
