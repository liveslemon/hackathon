import React, { Suspense } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crossFetch from "cross-fetch";
import { Skeleton, Stack, Typography } from "@/components/ui";
import { authenticatedFetchServer } from "@/lib/api-server";
import DashboardShellWrapper from "../../DashboardShellWrapper";
import ApplicantReviewClient from "./ApplicantReviewClient";

import { getSupabaseServer } from "@/lib/supabase-server";

export const revalidate = 0; // Don't cache review pages

async function getProfile(supabase: any, userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) {
    console.error("Profile Fetch Error:", error.message);
  }
  return data;
}

async function getInternship(supabase: any, internshipId: string, employerId: string) {
  const { data, error } = await supabase
    .from("internships")
    .select("*")
    .eq("id", internshipId)
    .eq("employer_id", employerId)
    .single();
    
  if (error) {
    console.error(`Internship Fetch Error [ID: ${internshipId}, User: ${employerId}]:`, error.message);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

async function getApplicants(internshipId: string) {
  try {
    const data = await authenticatedFetchServer(`/internships/${internshipId}/applicants`);
    return data.applicants || [];
  } catch (err) {
    console.error("Error fetching applicants:", err);
    return [];
  }
}

export default async function EmployerApplicantReviewPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const internshipId = params.id;
  const supabase = await getSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn("No user found in server session for internship review");
    redirect("/login/employer");
  }

  const profile = await getProfile(supabase, user.id);
  if (!profile || profile.role !== "employer") {
    console.warn(`Access denied: Profile for ${user.id} has role ${profile?.role}`);
    redirect("/");
  }

  const { data: internship, error: fetchError } = await getInternship(supabase, internshipId, user.id);
  if (!internship) {
    return (
      <DashboardShellWrapper userProfile={profile}>
        <div className="p-12 text-center space-y-4">
          <Typography variant="h3" color="error" weight="bold">Internship Access Denied</Typography>
          <Typography color="muted">
            We couldn't find internship <strong>{internshipId}</strong> or it isn't associated with your employer account (<strong>{user.id}</strong>).
          </Typography>
          {fetchError && (
            <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 max-w-lg mx-auto mt-6">
              <Typography variant="caption" color="error" className="font-mono text-xs">
                DB Error: {fetchError}
              </Typography>
            </div>
          )}
        </div>
      </DashboardShellWrapper>
    );
  }

  return (
    <DashboardShellWrapper userProfile={profile}>
      <main className="max-w-5xl mx-auto py-8 lg:py-12">
        <Suspense fallback={
          <Stack spacing={4}>
            <div className="h-8 w-48 bg-slate-100 rounded-xl animate-pulse mb-8" />
            <div className="h-32 w-full bg-slate-100 rounded-[32px] animate-pulse" />
            <div className="h-32 w-full bg-slate-100 rounded-[32px] animate-pulse" />
            <div className="h-32 w-full bg-slate-100 rounded-[32px] animate-pulse" />
          </Stack>
        }>
          <ApplicantLoader internshipId={internshipId} internship={internship} profile={profile} />
        </Suspense>
      </main>
    </DashboardShellWrapper>
  );
}

async function ApplicantLoader({ internshipId, internship, profile }: { internshipId: string, internship: any, profile: any }) {
  const applicants = await getApplicants(internshipId);
  return <ApplicantReviewClient internship={internship} applicants={applicants} userProfile={profile} />;
}
