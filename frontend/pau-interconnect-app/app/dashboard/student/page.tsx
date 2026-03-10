import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Dashboard from "./Dashboard";

interface Internship {
  id: string;
  company: string;
  role: string;
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
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/login/student");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .single();

  if (profileError || !profile) redirect("/login/student");

  const { data: internshipsData, error: internshipsError } = await supabase
    .from("internships")
    .select("*");

  if (internshipsError)
    console.error("Failed to fetch internships", internshipsError);

  const data: Internship[] = internshipsData || [];
  let internshipsWithMatches: Internship[] = [];

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/analyze-existing-cv`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: profile.id }),
      },
    );
    const result = await response.json();
    const matches: { internship_id: string; match_score: number }[] =
      Array.isArray(result?.results) ? result.results : [];

    internshipsWithMatches = data.map((internship) => ({
      ...internship,
      matchPercentage:
        matches.find((m) => m.internship_id === internship.id)?.match_score ??
        0,
    }));
  } catch (err) {
    console.error("Failed to fetch internship matches:", err);
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
