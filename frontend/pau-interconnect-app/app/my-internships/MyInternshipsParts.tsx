import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import InternshipCard from "@/components/InternshipCard";
import { Calendar, Briefcase, Heart, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { supabaseFetch } from "@/lib/supabase-fetch";

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
        setAll() {},
      },
    },
  );
}

export async function MyInternshipsSections() {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const userId = user.id;

  // Parallel fetch: Matches, Saved, Applied
  const [matchRes, savedRes, appliedRes] = await Promise.all([
    supabase
      .from("match_results")
      .select("internship_id, match_score")
      .eq("user_id", userId),
    supabase
      .from("saved_internships")
      .select("internship_id")
      .eq("user_id", userId),
    supabase
      .from("applied_internships")
      .select("internship_id, status")
      .eq("user_id", userId),
  ]);

  const matchMap = new Map();
  if (matchRes.data)
    matchRes.data.forEach((m) => matchMap.set(m.internship_id, m.match_score));

  const statusMap = new Map();
  if (appliedRes.data) {
    appliedRes.data.forEach(
      (r: { internship_id: string; status: string | null }) =>
        statusMap.set(r.internship_id, r.status),
    );
  }

  const savedIds = (savedRes.data ?? []).map(
    (r: { internship_id: string }) => r.internship_id,
  );
  const appliedIds = (appliedRes.data ?? []).map(
    (r: { internship_id: string }) => r.internship_id,
  );

  // Fetch internship details
  const [savedInternshipsRes, appliedInternshipsRes] = await Promise.all([
    savedIds.length > 0
      ? supabase.from("internships").select("*").in("id", savedIds)
      : Promise.resolve({ data: [] }),
    appliedIds.length > 0
      ? supabase.from("internships").select("*").in("id", appliedIds)
      : Promise.resolve({ data: [] }),
  ]);

  const savedInternships = (savedInternshipsRes.data ?? []).map((i) => ({
    ...i,
    matchPercentage: matchMap.get(i.id),
    applicationStatus: statusMap.get(i.id),
  }));

  const appliedInternships = (appliedInternshipsRes.data ?? []).map((i) => ({
    ...i,
    matchPercentage: matchMap.get(i.id),
    applicationStatus: statusMap.get(i.id),
  }));

  const expiringInternships = appliedInternships.filter((internship) => {
    if (!internship.deadline) return false;
    const daysLeft = Math.ceil(
      (new Date(internship.deadline).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return daysLeft > 0 && daysLeft <= 7;
  });

  return (
    <div className="space-y-12">
      {/* 1. Deadlines Section */}
      {expiringInternships.length > 0 && (
        <div className="bg-rose-50/50 border border-rose-100 rounded-2xl overflow-hidden p-6 md:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-white text-rose-500 rounded-xl flex items-center justify-center shadow-sm border border-rose-50">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Upcoming Deadlines
              </h3>
              <p className="text-sm text-slate-400">
                Don&apos;t miss out on these opportunities
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {expiringInternships.map((internship) => {
              const daysLeft = Math.ceil(
                (new Date(internship.deadline).getTime() -
                  new Date().getTime()) /
                  (1000 * 60 * 60 * 24),
              );
              return (
                <Link
                  href={`/internships/${internship.id}`}
                  key={internship.id}
                  className="block group"
                >
                  <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-rose-100 shadow-sm group-hover:border-rose-200 group-hover:shadow-md transition-all">
                    <div>
                      <p className="text-sm font-bold text-slate-700">
                        {internship.role}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        at {internship.company}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold border border-rose-100">
                      {daysLeft} days left
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Applied Section */}
      <section className="space-y-6">
        <header className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
            <Briefcase className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            Applied Internships{" "}
            <span className="text-slate-400 ml-1 font-medium">
              ({appliedInternships.length})
            </span>
          </h3>
        </header>
        {appliedInternships.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {appliedInternships.map((internship) => (
              <InternshipCard key={internship.id} internship={internship} />
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl py-12 px-6 text-center">
            <p className="text-sm text-slate-400">
              You haven&apos;t applied to any internships yet.
            </p>
            <Link
              href="/dashboard/student"
              className="inline-flex items-center gap-1.5 text-indigo-600 text-xs font-semibold mt-3 hover:gap-2 transition-all"
            >
              Explore opportunities <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </section>

      {/* 3. Saved Section */}
      <section className="space-y-6 pb-6">
        <header className="flex items-center gap-3">
          <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
            <Heart className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            Saved Internships{" "}
            <span className="text-slate-400 ml-1 font-medium">
              ({savedInternships.length})
            </span>
          </h3>
        </header>
        {savedInternships.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {savedInternships.map((internship) => (
              <InternshipCard key={internship.id} internship={internship} />
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl py-12 px-6 text-center">
            <p className="text-sm text-slate-400">
              Your wishlist is currently empty.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
