import { getSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { EmployerAnalyticsClient } from "./AnalyticsClient";

export default async function EmployerAnalyticsPage() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login/employer");

  const { data: internships } = await supabase
    .from("internships")
    .select(
      "id, role, field, category, created_at, deadline, status, view_count",
    )
    .eq("employer_id", user.id);

  const internshipIds = internships?.map((i) => i.id) || [];

  let applications: any[] = [];
  if (internshipIds.length > 0) {
    const { data } = await supabase
      .from("applied_internships")
      .select("id, status, stage, match_score, created_at, internship_id")
      .in("internship_id", internshipIds);
    applications = data || [];
  }

  return (
    <EmployerAnalyticsClient
      internships={internships || []}
      applications={applications}
    />
  );
}
