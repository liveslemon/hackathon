import React, { Suspense } from "react";
import { maskStudentForEmployer } from "@/lib/privacy";
import { redirect } from "next/navigation";
import { Stack, Typography, Skeleton } from "@/components/ui";
import DashboardShellWrapper from "../../DashboardShellWrapper";
import ApplicantReviewClient from "./ApplicantReviewClient";
import type { Applicant } from "./ApplicantReviewClient";

import { getSupabaseServer } from "@/lib/supabase-server";
import { getDashboardPathForRole, getUserRoleProfile } from "@/lib/role-guard";

export const revalidate = 0; // Don't cache review pages

type SupabaseServerClient = Awaited<ReturnType<typeof getSupabaseServer>>;

async function getProfile(supabase: SupabaseServerClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("Profile Fetch Error:", error.message);
  }
  return data;
}

async function getInternship(
  supabase: SupabaseServerClient,
  internshipId: string,
  employerId: string,
) {
  const { data, error } = await supabase
    .from("internships")
    .select("*")
    .eq("id", internshipId)
    .eq("employer_id", employerId)
    .single();

  if (error) {
    console.error(
      `Internship Fetch Error [ID: ${internshipId}, User: ${employerId}]:`,
      error.message,
    );
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

async function getApplicants(internshipId: string) {
  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("applied_internships")
      .select(
        "id, user_id, status, stage, match_score, created_at, cover_letter, profiles:profiles!user_id(id, full_name, email, course, level, cv_url, settings)",
      )
      .eq("internship_id", internshipId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching applicants:", error.message);
      return [];
    }

    const userIds = (data || []).map((app) => app.user_id).filter(Boolean);
    const liveScoreMap = new Map<string, number>();

    if (userIds.length > 0) {
      const { data: matchRows } = await supabase
        .from("match_results")
        .select("user_id, match_score")
        .eq("internship_id", internshipId)
        .in("user_id", userIds);

      if (matchRows) {
        for (const row of matchRows) {
          if (typeof row.match_score === "number") {
            liveScoreMap.set(row.user_id, Math.round(row.match_score));
          }
        }
      }
    }

    return (data || []).map((app) => {
      const profile = Array.isArray(app.profiles) ? app.profiles[0] : app.profiles;
      const liveScore = app.user_id ? liveScoreMap.get(app.user_id) : undefined;
      return {
        ...app,
        match_score: liveScore !== undefined ? liveScore : app.match_score,
        applied_match_score: app.match_score,
        profiles: profile ? maskStudentForEmployer(profile) : profile,
      };
    }) as Applicant[];
  } catch (err) {
    console.error("Error fetching applicants:", err);
    return [];
  }
}

export default async function EmployerApplicantReviewPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const internshipId = params.id;
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.warn("No user found in server session for internship review");
    redirect("/login/employer");
  }

  const { role, isAdmin } = await getUserRoleProfile(supabase, user.id);
  if (!role) redirect("/onboarding");
  if (role !== "employer") {
    redirect(getDashboardPathForRole(role, isAdmin));
  }

  const profile = await getProfile(supabase, user.id);
  if (!profile) redirect("/onboarding");

  const { data: internship, error: fetchError } = await getInternship(
    supabase,
    internshipId,
    user.id,
  );
  if (!internship) {
    return (
      <DashboardShellWrapper userProfile={profile}>
        <div className="p-12 text-center space-y-4 max-w-xl mx-auto">
          <Typography variant="h3" color="error" weight="bold">
            Internship Access Denied
          </Typography>
          <Typography color="muted">
            We couldn&apos;t find internship <strong>{internshipId}</strong> or
            it isn&apos;t associated with your employer account (
            <strong>{user.id}</strong>).
          </Typography>
          {fetchError && (
            <div className="bg-danger-subtle p-4 rounded-xl border border-border max-w-lg mx-auto mt-6">
              <Typography
                variant="caption"
                color="error"
                className="font-mono text-xs"
              >
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
      <main className="max-w-5xl mx-auto py-8 lg:py-12 px-4 sm:px-6">
        <Suspense
          fallback={
            <Stack spacing={4}>
              <Skeleton className="h-8 w-48 rounded-xl mb-6" />
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </Stack>
          }
        >
          <ApplicantLoader
            internshipId={internshipId}
            internship={internship}
            profile={profile}
          />
        </Suspense>
      </main>
    </DashboardShellWrapper>
  );
}

async function ApplicantLoader({
  internshipId,
  internship,
  profile,
}: {
  internshipId: string;
  internship: { role?: string } | null;
  profile: unknown;
}) {
  const applicants = await getApplicants(internshipId);
  return (
    <ApplicantReviewClient
      internship={internship}
      applicants={applicants}
      userProfile={profile}
    />
  );
}
