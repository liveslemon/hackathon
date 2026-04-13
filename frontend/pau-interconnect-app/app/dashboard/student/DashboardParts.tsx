import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crossFetch from "cross-fetch";
import DashboardHeader from "@/components/DashboardHeader";
import LogbookWidget from "@/components/LogbookWidget";
import InternshipGrid from "@/components/InternshipGrid";
import { Suspense } from "react";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: crossFetch },
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

// --- Profile Header ---
export async function ProfileHeaderSection() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return <DashboardHeader userProfile={profile} />;
}

// --- Logbook Section ---
export async function StudentLogbookSection() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return (
    <div className="px-4 sm:px-0 mb-8">
      <LogbookWidget userId={user.id} />
    </div>
  );
}

// --- Internship Grid Section ---
export async function InternshipGridSection() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  // Parallelize the three heavy data fetches
  const [internshipsResult, matchesResult, appliedResult] = await Promise.all([
    supabase.from("internships").select("*"),
    supabase.from("match_results").select("internship_id, match_score").eq("user_id", user.id),
    supabase.from("applied_internships").select("internship_id, status").eq("user_id", user.id)
  ]);

  const internshipsData = internshipsResult.data || [];
  const matches = matchesResult.data || [];
  const applications = appliedResult.data || [];
  
  const statusMap = new Map(applications.map(a => [a.internship_id, a.status]));

  const internshipsWithMatches = internshipsData.map((internship: any) => ({
    ...internship,
    matchPercentage: matches.find((m: any) => m.internship_id === internship.id)?.match_score ?? 0,
    applicationStatus: statusMap.get(internship.id)
  }));

  return <InternshipGrid initialInternships={internshipsWithMatches} userProfile={{ id: user.id }} />;
}
