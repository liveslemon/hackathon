import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseFetch } from "@/lib/supabase-fetch";
import DashboardShell from "@/components/DashboardShell";
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
      <div className="max-w-3xl mx-auto pb-12">
        <header className="mb-8 px-4 sm:px-0">
          <h2 className="text-2xl font-bold text-slate-800 leading-tight">
            Settings
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage your account, notifications, and privacy preferences
          </p>
        </header>
        <div className="px-4 sm:px-0">
          <StudentSettingsClient
            initialSettings={
              profile?.settings as {
                notifications: {
                  new_matches: boolean;
                  application_updates: boolean;
                  interview_invitations: boolean;
                  employer_messages: boolean;
                  saved_reminders: boolean;
                  weekly_digest: boolean;
                };
                privacy: {
                  profile_visibility: "everyone" | "employers" | "only_me";
                  cv_visibility: "everyone" | "employers" | "only_me";
                  phone_visibility: "everyone" | "employers" | "only_me";
                  email_visibility: "everyone" | "employers" | "only_me";
                };
              } | null
            }
          />
        </div>
      </div>
    </DashboardShell>
  );
}
