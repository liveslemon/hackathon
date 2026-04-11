import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crossFetch from "cross-fetch";
import Dashboard from "./Dashboard";

interface Internship {
  id: string;
  company: string;
  role: string;
  location: string;
  field: string;
  category: string;
  description: string;
  deadline: string;
  interests: string[];
  matchPercentage?: number;
}

export default async function StudentDashboardPage() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    throw new Error(
      "Supabase URL or Key is missing! Check your .env.local file.",
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { fetch: crossFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.warn("[Dashboard] No user found in getUser(), redirecting to login.");
    redirect("/login/student");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    console.warn("User has a session but no profile row found. Redirecting to onboarding.");
    redirect("/onboarding");
  }

  const { data: internshipsData, error: internshipsError } = await supabase
    .from("internships")
    .select("*");

  if (internshipsError)
    console.error("Failed to fetch internships", internshipsError);

  const data: Internship[] = internshipsData || [];
  let internshipsWithMatches: Internship[] = [];

  try {
    const { data: matchData, error: matchError } = await supabase
      .from("match_results")
      .select("internship_id, match_score")
      .eq("user_id", profile.id);

    const { data: appliedData, error: appliedError } = await supabase
      .from("applied_internships")
      .select("internship_id, status")
      .eq("user_id", profile.id);

    if (matchError) throw matchError;

    const matches = matchData || [];
    const applications = appliedData || [];
    const statusMap = new Map((applications || []).map(a => [a.internship_id, a.status]));

    internshipsWithMatches = data.map((internship) => ({
      ...internship,
      matchPercentage:
        matches.find((m) => m.internship_id === internship.id)?.match_score ??
        0,
      applicationStatus: statusMap.get(internship.id)
    }));
  } catch (err) {
    console.error("Failed to fetch internship matches or applications:", err);
    internshipsWithMatches = data.map((internship) => ({
      ...internship,
      matchPercentage: 0,
    }));
  }

  return (
    <Dashboard
      userProfile={profile}
      initialInternships={internshipsWithMatches}
    />
  );
}
