import DashboardShellWrapper from "../DashboardShellWrapper";
import CvDashboardClient from "./CvDashboardClient";
import SkillGapClient from "./SkillGapClient";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseFetch } from "@/lib/supabase-fetch";
import {
  DEV_AUTH_MODE_COOKIE_NAME,
  DEV_ROLE_COOKIE_NAME,
  getActiveDevModeRole,
  getDevModeProfileForRole,
  getUserRoleProfile,
  getDashboardPathForRole,
} from "@/lib/role-guard";

export default async function CvPage() {
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

  const devRole = getActiveDevModeRole({
    roleCookieValue: cookieStore.get(DEV_ROLE_COOKIE_NAME)?.value,
    modeCookieValue: cookieStore.get(DEV_AUTH_MODE_COOKIE_NAME)?.value,
  });

  if (devRole === "student") {
    const devProfile = getDevModeProfileForRole(devRole);
    return (
      <DashboardShellWrapper userProfile={devProfile}>
        <div className="pb-24 md:pb-12 space-y-10">
          <CvDashboardClient
            userId={devProfile.id}
            initialData={null}
            initialMetrics={{
              career_score: 0,
              ats_score: 0,
              avg_match_rate: 0,
              applications_sent: 0,
            }}
          />
          <SkillGapClient />
        </div>
      </DashboardShellWrapper>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login/student");
  }

  const { role, isAdmin } = await getUserRoleProfile(supabase, user.id);

  if (!role) {
    redirect("/onboarding");
  }

  if (role !== "student") {
    redirect(getDashboardPathForRole(role, isAdmin));
  }

  // Fetch CV data server-side so the client renders instantly
  const { data: cvProfile } = await supabase
    .from("profiles")
    .select("cv_text, cv_url, cv_structured, cv_processing_status")
    .eq("id", user.id)
    .maybeSingle();

  // Compute metrics server-side from match_results (no backend call needed)
  let metrics = {
    career_score: 0,
    ats_score: 0,
    avg_match_rate: 0,
    applications_sent: 0,
  };
  const hasCvData = Boolean(
    cvProfile?.cv_text ||
    cvProfile?.cv_structured ||
    cvProfile?.cv_url ||
    cvProfile?.cv_processing_status === "complete",
  );

  if (hasCvData) {
    const [matchRes, appsRes] = await Promise.all([
      supabase
        .from("match_results")
        .select("match_score")
        .eq("user_id", user.id),
      supabase.from("applied_internships").select("id").eq("user_id", user.id),
    ]);

    const matchScores = (matchRes.data ?? []).map(
      (r: { match_score: number | null }) => r.match_score ?? 0,
    );
    const avgMatch =
      matchScores.length > 0
        ? Math.round(
            matchScores.reduce((a, b) => a + b, 0) / matchScores.length,
          )
        : 0;

    // Derive ATS/career scores from CV structured data
    let atsScore = 0;
    let careerScore = 0;
    if (cvProfile?.cv_structured) {
      const s =
        typeof cvProfile.cv_structured === "string"
          ? (() => {
              try {
                return JSON.parse(cvProfile.cv_structured as string);
              } catch {
                return null;
              }
            })()
          : cvProfile.cv_structured;
      if (s && typeof s === "object") {
        // Simple heuristic: score based on how many sections are filled
        let filled = 0;
        if (s.skills) filled++;
        if (s.experience) filled++;
        if (s.education) filled++;
        if (s.projects) filled++;
        if (s.summary) filled++;
        if (s.certifications) filled++;
        atsScore = Math.min(100, filled * 16 + (avgMatch > 0 ? 10 : 0));
        careerScore = Math.min(100, filled * 14 + avgMatch);
      }
    }

    metrics = {
      career_score: careerScore,
      ats_score: atsScore,
      avg_match_rate: avgMatch,
      applications_sent: appsRes.data?.length ?? 0,
    };
  }

  return (
    <DashboardShellWrapper
      userProfile={{ id: user.id, email: user.email ?? null }}
    >
      <div className="pb-24 md:pb-12 space-y-10">
        <CvDashboardClient
          userId={user.id}
          initialData={cvProfile}
          initialMetrics={metrics}
        />
        <SkillGapClient />
      </div>
    </DashboardShellWrapper>
  );
}
