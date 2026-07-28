import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseFetch } from "@/lib/supabase-fetch";
import DashboardHeader from "@/components/DashboardHeader";
import LogbookWidget from "@/components/LogbookWidget";
import InternshipGrid from "@/components/InternshipGrid";
import {
  DEV_AUTH_MODE_COOKIE_NAME,
  DEV_ROLE_COOKIE_NAME,
  getActiveDevModeRole,
  getDevModeProfileForRole,
} from "@/lib/role-guard";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: supabaseFetch },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {}
        },
      },
    },
  );
}

interface MatchRow {
  internship_id: string;
  match_score: number | null;
}

interface InternshipWithMatch {
  id: string;
  company: string;
  role: string;
  location: string;
  field: string;
  category: string;
  description: string;
  deadline: string;
  interests: string[];
  matchPercentage: number;
  applicationStatus?: string;
}

// --- Profile Header ---
export async function ProfileHeaderSection() {
  const cookieStore = await cookies();
  const devRole = getActiveDevModeRole({
    roleCookieValue: cookieStore.get(DEV_ROLE_COOKIE_NAME)?.value,
    modeCookieValue: cookieStore.get(DEV_AUTH_MODE_COOKIE_NAME)?.value,
  });
  const devProfile = getDevModeProfileForRole(devRole);

  if (devRole === "student") {
    return <DashboardHeader userProfile={devProfile} />;
  }

  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
  const cookieStore = await cookies();
  const devRole = getActiveDevModeRole({
    roleCookieValue: cookieStore.get(DEV_ROLE_COOKIE_NAME)?.value,
    modeCookieValue: cookieStore.get(DEV_AUTH_MODE_COOKIE_NAME)?.value,
  });

  if (devRole === "student") {
    return (
      <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">
            Today&apos;s logbook check-in
          </h3>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Synced profile
          </span>
        </div>
        <p className="text-sm text-slate-600">
          Your dev profile is now active, so the dashboard can render with
          real-looking student details.
        </p>
      </div>
    );
  }

  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return (
    <div className="px-4 sm:px-0 mb-8">
      <LogbookWidget userId={user.id} />
    </div>
  );
}

// --- Internship Grid Section ---
export async function InternshipGridSection() {
  const cookieStore = await cookies();
  const devRole = getActiveDevModeRole({
    roleCookieValue: cookieStore.get(DEV_ROLE_COOKIE_NAME)?.value,
    modeCookieValue: cookieStore.get(DEV_AUTH_MODE_COOKIE_NAME)?.value,
  });
  const devProfile = getDevModeProfileForRole(devRole);

  if (devRole === "student") {
    return (
      <InternshipGrid
        initialInternships={[
          {
            id: "dev-1",
            company: "PAU Innovation Lab",
            role: "Product Design Intern",
            location: "Lagos, Nigeria",
            field: "Design",
            category: "Design",
            description:
              "Help shape the next cohort of student-facing product experiences.",
            deadline: "2026-09-10",
            interests: ["Product Design", "Research"],
            matchPercentage: 92,
            applicationStatus: "pending",
          },
          {
            id: "dev-2",
            company: "GreenStack",
            role: "Frontend Engineering Intern",
            location: "Remote",
            field: "Engineering",
            category: "Software",
            description:
              "Build polished interfaces for a climate-tech platform.",
            deadline: "2026-08-21",
            interests: ["Software Engineering", "Frontend"],
            matchPercentage: 88,
            applicationStatus: "applied",
          },
        ]}
        userProfile={devProfile ?? { id: "dev-student" }}
      />
    );
  }

  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Parallelize the three heavy data fetches
  const [internshipsResult, matchesResult, appliedResult] = await Promise.all([
    supabase.from("internships").select("*"),
    supabase
      .from("match_results")
      .select("internship_id, match_score")
      .eq("user_id", user.id),
    supabase
      .from("applied_internships")
      .select("internship_id, status")
      .eq("user_id", user.id),
  ]);

  const internshipsData = internshipsResult.data || [];
  const matches = matchesResult.data || [];
  const applications = appliedResult.data || [];

  const statusMap = new Map(
    applications.map((a) => [a.internship_id, a.status]),
  );

  const internshipsWithMatches: InternshipWithMatch[] = internshipsData.map(
    (internship) => ({
      ...internship,
      matchPercentage:
        matches.find((m: MatchRow) => m.internship_id === internship.id)
          ?.match_score ?? 0,
      applicationStatus: statusMap.get(internship.id),
    }),
  );

  return (
    <InternshipGrid
      initialInternships={internshipsWithMatches}
      userProfile={{ id: user.id }}
    />
  );
}
