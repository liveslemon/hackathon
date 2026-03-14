"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Typography,
  Stack,
  Card,
  CardContent,
  Badge,
} from "@/components/ui";
import { FiBriefcase, FiHeart, FiCalendar, FiClock } from "react-icons/fi";
import InternshipCard from "@/components/InternshipCard";
import DashboardHeader from "@/components/DashboardHeader";

const MyInternshipsPage = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<any>({});
  const [savedInternships, setSavedInternships] = useState<any[]>([]);
  const [appliedInternships, setAppliedInternships] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id ?? null;

        if (userId) {
          const { data: profileRow } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();
          setProfile(profileRow ?? {});

          const { data: matchData } = await supabase
            .from("match_results")
            .select("internship_id, match_score")
            .eq("user_id", userId);
          const matchMap = new Map();
          if (matchData) {
            matchData.forEach((m) => matchMap.set(m.internship_id, m.match_score));
          }

          const { data: savedRows } = await supabase
            .from("saved_internships")
            .select("internship_id")
            .eq("user_id", userId);

          const { data: appliedRows } = await supabase
            .from("applied_internships")
            .select("internship_id, status")
            .eq("user_id", userId);

          const statusMap = new Map();
          if (appliedRows) {
            appliedRows.forEach((r: any) => statusMap.set(r.internship_id, r.status));
          }

          const savedIds = (savedRows ?? []).map((r: any) => r.internship_id);
          if (savedIds.length > 0) {
            const { data: internshipsData } = await supabase
              .from("internships")
              .select("*")
              .in("id", savedIds);
            
            const savedWithMatches = (internshipsData ?? []).map((internship: any) => ({
              ...internship,
              matchPercentage: matchMap.get(internship.id) ?? undefined,
              applicationStatus: statusMap.get(internship.id)
            }));
            setSavedInternships(savedWithMatches);
          } else {
            setSavedInternships([]);
          }

          const appliedIds = (appliedRows ?? []).map(
            (r: any) => r.internship_id,
          );

          if (appliedIds.length > 0) {
            const { data: appliedData } = await supabase
              .from("internships")
              .select("*")
              .in("id", appliedIds);
            
            const appliedWithMatches = (appliedData ?? []).map((internship: any) => ({
              ...internship,
              matchPercentage: matchMap.get(internship.id) ?? undefined,
              applicationStatus: statusMap.get(internship.id)
            }));
            setAppliedInternships(appliedWithMatches);
          } else {
            setAppliedInternships([]);
          }
        } else {
          setProfile({});
          setSavedInternships([]);
          setAppliedInternships([]);
          router.push("/login/student");
        }
      } catch (err) {
        console.error("Error loading internships data:", err);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, [router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#667eea]"></div>
      </div>
    );
  }

  const expiringInternships = appliedInternships.filter((internship) => {
    const daysLeft = Math.ceil(
      (new Date(internship.deadline).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24),
    );
    return daysLeft > 0 && daysLeft <= 7;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <DashboardHeader userProfile={profile} />

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-10 space-y-12">
        <header className="flex items-center justify-between">
          <Typography variant="h2" weight="bold">My Internships</Typography>
          <div className="px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
            <FiClock className="text-indigo-500" />
            <Typography variant="caption" weight="bold" color="muted">Updated just now</Typography>
          </div>
        </header>

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
                  const daysLeft = Math.ceil(
                    (new Date(internship.deadline).getTime() -
                      new Date().getTime()) /
                      (1000 * 60 * 60 * 24),
                  );
                  return (
                    <div
                      key={internship.id}
                      className="flex justify-between items-center p-5 bg-white rounded-[20px] border border-rose-100 shadow-sm hover:translate-x-1 transition-transform cursor-pointer"
                      onClick={() => router.push(`/internships/${internship.id}`)}
                    >
                      <Typography weight="bold" className="text-slate-700">
                        {internship.role} <span className="text-slate-400 font-medium ml-2">at {internship.company}</span>
                      </Typography>
                      <Badge variant="error" size="md" className="rounded-xl px-4 py-1.5 font-bold">
                        {daysLeft} days left
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <section className="space-y-6">
          <header className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <FiBriefcase className="w-5 h-5" />
            </div>
            <Typography variant="h4" weight="bold">Applied Internships ({appliedInternships.length})</Typography>
          </header>
          
          {appliedInternships.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {appliedInternships.map((internship) => (
                <InternshipCard key={internship.id} internship={internship} />
              ))}
            </div>
          ) : (
            <div className="bg-white/50 border border-slate-100 rounded-[32px] p-12 text-center text-slate-500">
              <Typography variant="body1">You haven't applied to any internships yet.</Typography>
            </div>
          )}
        </section>

        <section className="space-y-6 pb-12">
          <header className="flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              <FiHeart className="w-5 h-5" />
            </div>
            <Typography variant="h4" weight="bold">Saved Internships ({savedInternships.length})</Typography>
          </header>

          {savedInternships.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {savedInternships.map((internship) => (
                <InternshipCard key={internship.id} internship={internship} />
              ))}
            </div>
          ) : (
            <div className="bg-white/50 border border-slate-100 rounded-[32px] p-12 text-center text-slate-500">
              <Typography variant="body1">Your wishlist is currently empty.</Typography>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default MyInternshipsPage;
