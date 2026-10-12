import { createServerClient } from "@supabase/ssr";
import { INTERNSHIP_LIST_COLUMNS } from "@/lib/internship-columns";
import { getDaysUntilDeadline } from "@/lib/deadlines";
import { cookies } from "next/headers";
import InternshipCard from "@/components/InternshipCard";
import { EmptyState } from "@/components/ui";
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
      .select("id, internship_id, status, stage")
      .eq("user_id", userId),
  ]);

  const matchMap = new Map();
  if (matchRes.data)
    matchRes.data.forEach((m) => matchMap.set(m.internship_id, m.match_score));

  const statusMap = new Map();
  const stageMap = new Map();
  const applicationIdMap = new Map();
  if (appliedRes.data) {
    appliedRes.data.forEach(
      (r: {
        id: string;
        internship_id: string;
        status: string | null;
        stage: string | null;
      }) => {
        statusMap.set(r.internship_id, r.status);
        stageMap.set(r.internship_id, r.stage);
        applicationIdMap.set(r.internship_id, r.id);
      },
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
      ? supabase.from("internships").select(INTERNSHIP_LIST_COLUMNS).in("id", savedIds)
      : Promise.resolve({ data: [] }),
    appliedIds.length > 0
      ? supabase.from("internships").select(INTERNSHIP_LIST_COLUMNS).in("id", appliedIds)
      : Promise.resolve({ data: [] }),
  ]);

  const savedInternships = (savedInternshipsRes.data ?? []).map((i) => ({
    ...i,
    matchPercentage: matchMap.get(i.id),
    applicationStatus: statusMap.get(i.id),
    applicationStage: stageMap.get(i.id),
    applicationId: applicationIdMap.get(i.id),
  }));

  const appliedInternships = (appliedInternshipsRes.data ?? []).map((i) => ({
    ...i,
    matchPercentage: matchMap.get(i.id),
    applicationStatus: statusMap.get(i.id),
    applicationStage: stageMap.get(i.id) || "applied",
    applicationId: applicationIdMap.get(i.id),
  }));

  const expiringInternships = appliedInternships.filter((internship) => {
    const daysLeft = getDaysUntilDeadline(internship.deadline);
    return daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
  });

  return (
    <div className="space-y-12">
      {/* 1. Deadlines Section */}
      {expiringInternships.length > 0 && (
        <div className="bg-danger-subtle/30 border border-danger/20 rounded-2xl overflow-hidden p-6 md:p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-surface text-danger-fg rounded-xl flex items-center justify-center shadow-xs border border-danger/20">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-fg">
                Upcoming Application Deadlines
              </h3>
              <p className="text-sm text-fg-muted">
                These roles will close within the next 7 days
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {expiringInternships.map((internship) => {
              const daysLeft = getDaysUntilDeadline(internship.deadline);
              const badgeText =
                daysLeft === 0 ? "Ends today" : `${daysLeft} days left`;
              return (
                <Link
                  href={`/internships/${internship.id}`}
                  key={internship.id}
                  className="block group"
                >
                  <div className="flex justify-between items-center p-4 bg-surface rounded-xl border border-danger/20 shadow-xs group-hover:border-danger/40 transition-all">
                    <div>
                      <p className="text-sm font-bold text-fg">
                        {internship.role}
                      </p>
                      <p className="text-xs text-fg-muted mt-0.5">
                        at {internship.company}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-danger-subtle text-danger-fg rounded-lg text-xs font-bold border border-danger/20">
                      {badgeText}
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
          <div className="w-9 h-9 bg-brand-subtle text-brand rounded-xl flex items-center justify-center">
            <Briefcase className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-bold text-fg">
            Applied Internships{" "}
            <span className="text-fg-subtle ml-1 font-normal text-sm">
              ({appliedInternships.length})
            </span>
          </h3>
        </header>
        {appliedInternships.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {appliedInternships.map((internship) => (
              <InternshipCard key={internship.id} internship={internship} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Briefcase className="w-8 h-8" />}
            title="No applications submitted yet"
            description="Explore open internship listings on the dashboard and apply directly."
            action={{
              label: "Explore Opportunities",
              href: "/dashboard/student",
            }}
          />
        )}
      </section>

      {/* 3. Saved Section */}
      <section className="space-y-6 pb-6">
        <header className="flex items-center gap-3">
          <div className="w-9 h-9 bg-danger-subtle text-danger-fg rounded-xl flex items-center justify-center">
            <Heart className="w-4 h-4" />
          </div>
          <h3 className="text-lg font-bold text-fg">
            Saved Internships{" "}
            <span className="text-fg-subtle ml-1 font-normal text-sm">
              ({savedInternships.length})
            </span>
          </h3>
        </header>
        {savedInternships.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {savedInternships.map((internship) => (
              <InternshipCard key={internship.id} internship={internship} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Heart className="w-8 h-8" />}
            title="Your wishlist is empty"
            description="Save interesting internships as you browse so you can review them later."
            action={{
              label: "Browse Internships",
              href: "/dashboard/student",
            }}
          />
        )}
      </section>
    </div>
  );
}
