import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseFetch } from "@/lib/supabase-fetch";
import AnalyticsView from "../AnalyticsView";

export default async function AnalyticsPage() {
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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );

  const { data, error } = await supabase.from("internships").select("category");

  if (error) {
    console.error("Error fetching internships:", error);
    return null;
  }

  const { count: applicationCount } = await supabase
    .from("applied_internships")
    .select("id", { count: "exact", head: true });

  const counts: Record<string, number> = {};
  (data || []).forEach((item) => {
    const category = item.category || "General";
    counts[category] = (counts[category] || 0) + 1;
  });

  const categoryArray = Object.entries(counts).map(([label, value]) => ({
    label,
    value,
  }));

  const totalInternships = (data || []).length;
  const totalApplications = applicationCount || 0;
  const avgApplications =
    totalInternships > 0
      ? (totalApplications / totalInternships).toFixed(1)
      : "0.0";

  return (
    <AnalyticsView
      categories={categoryArray}
      totalApplications={totalApplications}
      avgApplications={avgApplications}
    />
  );
}
