import React, { Suspense } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Stack } from "@/components/ui";
import { authenticatedFetchServer } from "@/lib/api-server";
import DashboardShellWrapper from "../DashboardShellWrapper";
import LogbookReviewClient from "./LogbookReviewClient";

import { getSupabaseServer } from "@/lib/supabase-server";
import type { Profile } from "@/types/domain";
import { getDashboardPathForRole, getUserRoleProfile } from "@/lib/role-guard";

export const revalidate = 0; // Don't cache review pages

interface LogbookEntry {
  id: string;
  student_id: string;
  date: string;
  activities_raw: string;
  activities_enhanced: string | null;
  status: string;
  feedback_notes?: string;
  profiles?: {
    full_name: string;
    email: string;
    avatar_url: string;
  };
}

async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("Profile Fetch Error:", error.message);
  }
  return (data as Profile | null) ?? null;
}

async function getLogbookEntries(userId: string) {
  try {
    const data = await authenticatedFetchServer<{ entries?: LogbookEntry[] }>(
      `/api/logbook/employer?employer_id=${userId}`,
    );
    return data.entries || [];
  } catch (err) {
    console.error("Error fetching logbook entries:", err);
    return [];
  }
}

export default async function EmployerLogbookPage() {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.warn("No user found in server session for logbook review");
    redirect("/login/employer");
  }

  const { role, isAdmin } = await getUserRoleProfile(supabase, user.id);
  if (!role) redirect("/onboarding");
  if (role !== "employer") {
    redirect(getDashboardPathForRole(role, isAdmin));
  }

  const profile = await getProfile(supabase, user.id);
  if (!profile) redirect("/onboarding");

  return (
    <DashboardShellWrapper userProfile={profile}>
      <main className="max-w-5xl mx-auto py-8 lg:py-12">
        <Suspense
          fallback={
            <Stack spacing={8}>
              <div className="space-y-2 mb-8">
                <div className="h-10 w-64 bg-slate-100 rounded-xl animate-pulse" />
                <div className="h-4 w-96 bg-slate-100 rounded-lg animate-pulse" />
              </div>
              <div className="h-48 w-full bg-slate-100 rounded-[32px] animate-pulse" />
              <div className="h-48 w-full bg-slate-100 rounded-[32px] animate-pulse" />
            </Stack>
          }
        >
          <LogbookLoader userId={user.id} />
        </Suspense>
      </main>
    </DashboardShellWrapper>
  );
}

async function LogbookLoader({ userId }: { userId: string }) {
  const entries = await getLogbookEntries(userId);
  return <LogbookReviewClient entries={entries} />;
}
