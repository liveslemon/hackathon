import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import AnalyticsView from "../AnalyticsView";

export default async function AnalyticsPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

  const counts: Record<string, number> = {};
  data.forEach((item) => {
    const category = item.category || "Unknown";
    counts[category] = (counts[category] || 0) + 1;
  });

  const categoryArray = Object.entries(counts).map(([label, value]) => ({
    label,
    value,
  }));

  return <AnalyticsView categories={categoryArray} />;
}

