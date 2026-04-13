import React, { Suspense } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crossFetch from "cross-fetch";
import { Skeleton, Stack } from "@/components/ui";
import { authenticatedFetchServer } from "@/lib/api-server";
import DashboardShellWrapper from "../DashboardShellWrapper";
import LogbookReviewClient from "./LogbookReviewClient";

import { getSupabaseServer } from "@/lib/supabase-server";

export const revalidate = 0; // Don't cache review pages

async function getProfile(supabase: any, userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) {
    console.error("Profile Fetch Error:", error.message);
  }
  return data;
}

async function getLogbookEntries(userId: string) {
  try {
    const data = await authenticatedFetchServer(`/api/logbook/employer?employer_id=${userId}`);
    return data.entries || [];
  } catch (err) {
    console.error("Error fetching logbook entries:", err);
    return [];
  }
}

export default async function EmployerLogbookPage() {
  const supabase = await getSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn("No user found in server session for logbook review");
    redirect("/login/employer");
  }

  const profile = await getProfile(supabase, user.id);
  if (!profile || profile.role !== "employer") {
    console.warn(`Access denied: Profile for ${user.id} has role ${profile?.role}`);
    redirect("/");
  }

  return (
    <DashboardShellWrapper userProfile={profile}>
      <main className="max-w-5xl mx-auto py-8 lg:py-12">
        <Suspense fallback={
          <Stack spacing={8}>
            <div className="space-y-2 mb-8">
              <div className="h-10 w-64 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-4 w-96 bg-slate-100 rounded-lg animate-pulse" />
            </div>
            <div className="h-48 w-full bg-slate-100 rounded-[32px] animate-pulse" />
            <div className="h-48 w-full bg-slate-100 rounded-[32px] animate-pulse" />
          </Stack>
        }>
          <LogbookLoader userId={user.id} profile={profile} />
        </Suspense>
      </main>
    </DashboardShellWrapper>
  );
}

async function LogbookLoader({ userId, profile }: { userId: string, profile: any }) {
  const entries = await getLogbookEntries(userId);
  return <LogbookReviewClient entries={entries} userProfile={profile} />;
};
