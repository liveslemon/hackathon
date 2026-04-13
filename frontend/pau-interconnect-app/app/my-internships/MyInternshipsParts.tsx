import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import crossFetch from "cross-fetch";
import InternshipCard from "@/components/InternshipCard";
import { Typography, Card, CardContent, Stack, Badge } from "@/components/ui";
import { FiCalendar, FiBriefcase, FiHeart } from "react-icons/fi";
import Link from "next/link";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: crossFetch },
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {}
      },
    }
  );
}

export async function MyInternshipsSections() {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const userId = user.id;

  // Parallel fetch: Matches, Saved, Applied
  const [matchRes, savedRes, appliedRes] = await Promise.all([
    supabase.from("match_results").select("internship_id, match_score").eq("user_id", userId),
    supabase.from("saved_internships").select("internship_id").eq("user_id", userId),
    supabase.from("applied_internships").select("internship_id, status").eq("user_id", userId)
  ]);

  const matchMap = new Map();
  if (matchRes.data) matchRes.data.forEach((m) => matchMap.set(m.internship_id, m.match_score));

  const statusMap = new Map();
  if (appliedRes.data) appliedRes.data.forEach((r: any) => statusMap.set(r.internship_id, r.status));

  const savedIds = (savedRes.data ?? []).map((r: any) => r.internship_id);
  const appliedIds = (appliedRes.data ?? []).map((r: any) => r.internship_id);

  // Fetch internship details
  const [savedInternshipsRes, appliedInternshipsRes] = await Promise.all([
    savedIds.length > 0 ? supabase.from("internships").select("*").in("id", savedIds) : Promise.resolve({ data: [] }),
    appliedIds.length > 0 ? supabase.from("internships").select("*").in("id", appliedIds) : Promise.resolve({ data: [] })
  ]);

  const savedInternships = (savedInternshipsRes.data ?? []).map(i => ({
    ...i,
    matchPercentage: matchMap.get(i.id),
    applicationStatus: statusMap.get(i.id)
  }));

  const appliedInternships = (appliedInternshipsRes.data ?? []).map(i => ({
    ...i,
    matchPercentage: matchMap.get(i.id),
    applicationStatus: statusMap.get(i.id)
  }));

  const expiringInternships = appliedInternships.filter((internship) => {
    const daysLeft = Math.ceil((new Date(internship.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft > 0 && daysLeft <= 7;
  });

  return (
    <div className="space-y-12">
      {/* 1. Deadlines Section */}
      {expiringInternships.length > 0 && (
        <Card className="border-rose-100 bg-rose-50/50 shadow-xl shadow-rose-50 rounded-[32px] overflow-hidden">
          <CardContent className="p-8">
            <Stack direction="row" align="center" spacing={4} className="mb-6">
              <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
                <FiCalendar className="w-6 h-6" />
              </div>
              <div>
                <Typography variant="h4" weight="bold" className="text-slate-900">Upcoming Deadlines</Typography>
                <Typography variant="body2" color="muted">Don't miss out on these opportunities</Typography>
              </div>
            </Stack>
            <div className="space-y-3">
              {expiringInternships.map((internship) => {
                const daysLeft = Math.ceil((new Date(internship.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <Link href={`/internships/${internship.id}`} key={internship.id}>
                    <div className="flex justify-between items-center p-5 bg-white rounded-[20px] border border-rose-100 shadow-sm hover:translate-x-1 transition-transform mb-3">
                      <Typography weight="bold" className="text-slate-700">
                        {internship.role} <span className="text-slate-400 font-medium ml-2">at {internship.company}</span>
                      </Typography>
                      <Badge variant="error" size="md" className="rounded-xl px-4 py-1.5 font-bold">{daysLeft} days left</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Applied Section */}
      <section className="space-y-6">
        <header className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><FiBriefcase className="w-5 h-5" /></div>
          <Typography variant="h4" weight="bold">Applied Internships ({appliedInternships.length})</Typography>
        </header>
        {appliedInternships.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {appliedInternships.map((internship) => <InternshipCard key={internship.id} internship={internship} />)}
          </div>
        ) : (
          <div className="bg-white/50 border border-slate-100 rounded-[32px] p-12 text-center text-slate-500">
            <Typography variant="body1">You haven't applied to any internships yet.</Typography>
          </div>
        )}
      </section>

      {/* 3. Saved Section */}
      <section className="space-y-6 pb-12">
        <header className="flex items-center gap-4">
          <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center"><FiHeart className="w-5 h-5" /></div>
          <Typography variant="h4" weight="bold">Saved Internships ({savedInternships.length})</Typography>
        </header>
        {savedInternships.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {savedInternships.map((internship) => <InternshipCard key={internship.id} internship={internship} />)}
          </div>
        ) : (
          <div className="bg-white/50 border border-slate-100 rounded-[32px] p-12 text-center text-slate-500">
            <Typography variant="body1">Your wishlist is currently empty.</Typography>
          </div>
        )}
      </section>
    </div>
  );
}
