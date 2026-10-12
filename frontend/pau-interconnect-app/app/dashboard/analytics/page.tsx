import { getSupabaseServer } from "@/lib/supabase-server";
import AnalyticsView from "../AnalyticsView";
import DashboardShellWrapper from "../employer/DashboardShellWrapper";

export default async function AnalyticsPage() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [internshipsRes, profileRes, applicationsRes] = await Promise.all([
    supabase.from("internships").select("category"),
    user
      ? supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("applied_internships")
      .select("id", { count: "exact", head: true }),
  ]);

  const data = internshipsRes.data || [];
  const applicationCount = applicationsRes.count || 0;

  const counts: Record<string, number> = {};
  data.forEach((item) => {
    const category = item.category || "General";
    counts[category] = (counts[category] || 0) + 1;
  });

  const categoryArray = Object.entries(counts).map(([label, value]) => ({
    label,
    value,
  }));

  const totalInternships = data.length;
  const totalApplications = applicationCount;
  const avgApplications =
    totalInternships > 0
      ? (totalApplications / totalInternships).toFixed(1)
      : "0.0";

  return (
    <DashboardShellWrapper userProfile={profileRes.data}>
      <AnalyticsView
        categories={categoryArray}
        totalApplications={totalApplications}
        avgApplications={avgApplications}
      />
    </DashboardShellWrapper>
  );
}

