import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseFetch } from "@/lib/supabase-fetch";
import DashboardShell from "@/components/DashboardShell";
import { PageHeader } from "@/components/ui";
import StudentSettingsClient from "./StudentSettingsClient";

export default async function StudentSettingsPage() {
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

  if (!user) {
    redirect("/login/student");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("settings")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <DashboardShell userProfile={{ id: user.id, email: user.email ?? null }}>
      <div className="max-w-4xl mx-auto pb-12 px-4 sm:px-0">
        <PageHeader
          title="Account Settings"
          description="Manage theme appearance, application notifications, privacy visibility, and account security."
          className="mb-8"
        />
        <StudentSettingsClient
          initialSettings={profile?.settings ?? null}
        />
      </div>
    </DashboardShell>
  );
}
