import React from "react";
import DashboardShellWrapper from "../DashboardShellWrapper";
import SettingsClient from "./SettingsClient";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function EmployerSettingsPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "employer") {
    redirect("/dashboard/student");
  }

  return (
    <DashboardShellWrapper userProfile={profile}>
      <SettingsClient user={user} profile={profile} />
    </DashboardShellWrapper>
  );
}
