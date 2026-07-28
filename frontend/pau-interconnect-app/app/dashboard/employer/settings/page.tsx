import React from "react";
import DashboardShellWrapper from "../DashboardShellWrapper";
import SettingsClient from "./SettingsClient";
import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getDashboardPathForRole, getUserRoleProfile } from "@/lib/role-guard";

export default async function EmployerSettingsPage() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login/employer");
  }

  const { role, isAdmin } = await getUserRoleProfile(supabase, user.id);
  if (!role) redirect("/onboarding");
  if (role !== "employer") {
    redirect(getDashboardPathForRole(role, isAdmin));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <DashboardShellWrapper userProfile={profile}>
      <SettingsClient user={user} profile={profile} />
    </DashboardShellWrapper>
  );
}
