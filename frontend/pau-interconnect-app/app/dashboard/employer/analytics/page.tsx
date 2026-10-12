import { getSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { EmployerAnalyticsClient } from "./AnalyticsClient";
import DashboardShellWrapper from "../DashboardShellWrapper";

export default async function EmployerAnalyticsPage() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login/employer");

  const [internshipsRes, profileRes] = await Promise.all([
    supabase
      .from("internships")
      .select(
        "id, role, field, category, created_at, deadline, status, view_count",
      )
      .eq("employer_id", user.id),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
  ]);

  const internships = internshipsRes.data || [];
  const internshipIds = internships.map((i) => i.id);

  let applications: Array<{
    id: string;
    status: string | null;
    stage: string | null;
    match_score: number | null;
    created_at: string;
    internship_id: string;
  }> = [];

  if (internshipIds.length > 0) {
    const { data } = await supabase
      .from("applied_internships")
      .select("id, user_id, status, stage, match_score, created_at, internship_id")
      .in("internship_id", internshipIds);

    const rawApps = data || [];
    const userIds = rawApps.map((a) => a.user_id).filter(Boolean);

    if (userIds.length > 0) {
      const { data: matchRows } = await supabase
        .from("match_results")
        .select("user_id, internship_id, match_score")
        .in("user_id", userIds)
        .in("internship_id", internshipIds);

      const liveMap = new Map(
        (matchRows || []).map((m) => [`${m.user_id}:${m.internship_id}`, m.match_score]),
      );

      applications = rawApps.map((a) => {
        const live = liveMap.get(`${a.user_id}:${a.internship_id}`);
        return {
          id: a.id,
          status: a.status,
          stage: a.stage,
          match_score: typeof live === "number" ? Math.round(live) : a.match_score,
          created_at: a.created_at,
          internship_id: a.internship_id,
        };
      });
    } else {
      applications = rawApps;
    }
  }

  return (
    <DashboardShellWrapper userProfile={profileRes.data}>
      <EmployerAnalyticsClient
        internships={internships}
        applications={applications}
      />
    </DashboardShellWrapper>
  );
}

