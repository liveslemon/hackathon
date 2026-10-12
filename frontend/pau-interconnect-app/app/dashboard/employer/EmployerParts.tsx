import { EmployerActivityClient } from "./EmployerActivityClient";
import { getSupabaseServer } from "@/lib/supabase-server";
import DashboardHeader from "@/components/DashboardHeader";
import { Typography, Stack, StatCard, EmptyState } from "@/components/ui";


import { Briefcase, Users, Target, Clock } from "lucide-react";
import Link from "next/link";
import { EmployerQuickActionsClient } from "./EmployerQuickActionsClient";

// --- Header ---
export async function EmployerHeaderSection() {
  const supabase = await getSupabaseServer();
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

function getOneWeekAgoISO() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

// --- Quick Actions Toolbar ---
export function EmployerQuickActionsSection({
  profile,
}: {
  profile: { id?: string; company_name?: string } | Record<string, unknown>;
}) {
  return (
    <EmployerQuickActionsClient
      profile={profile as { id: string; company_name: string }}
    />
  );
}

// --- Stats Section ---
export async function EmployerStatsSection() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: internshipsRes } = await supabase
    .from("internships")
    .select("id")
    .eq("employer_id", user.id);

  let applicationCount = 0;
  let acceptedCount = 0;
  let newThisWeek = 0;
  const oneWeekAgo = getOneWeekAgoISO();

  if (internshipsRes && internshipsRes.length > 0) {
    const ids = internshipsRes.map((i) => i.id);
    const { count } = await supabase
      .from("applied_internships")
      .select("*", { count: "exact", head: true })
      .in("internship_id", ids);
    applicationCount = count || 0;

    const { count: accCount } = await supabase
      .from("applied_internships")
      .select("*", { count: "exact", head: true })
      .in("internship_id", ids)
      .eq("status", "accepted");
    acceptedCount = accCount || 0;

    const { count: weekCount } = await supabase
      .from("applied_internships")
      .select("*", { count: "exact", head: true })
      .in("internship_id", ids)
      .gte("created_at", oneWeekAgo);
    newThisWeek = weekCount || 0;
  }

  const { count: pendingLogsCount } = await supabase
    .from("logbook_entries")
    .select("*", { count: "exact", head: true })
    .eq("employer_id", user.id)
    .eq("status", "pending");
  const pendingReviews = pendingLogsCount || 0;

  const acceptanceRate =
    applicationCount > 0 ? Math.round((acceptedCount / applicationCount) * 100) : 0;
  const internshipCount = internshipsRes?.length || 0;

  return (
    <div className="mb-10">
      {/* Activity Summary Line */}
      <div className="mb-6 px-1 flex items-center justify-between">
        <Typography variant="body2" color="muted">
          You have{" "}
          <strong className="text-fg font-semibold">{newThisWeek}</strong> new{" "}
          {newThisWeek === 1 ? "application" : "applications"} this week and{" "}
          <strong className="text-fg font-semibold">{pendingReviews}</strong> logbook{" "}
          {pendingReviews === 1 ? "entry" : "entries"} pending review.
        </Typography>
      </div>

      {internshipCount === 0 && (
        <div className="mb-8">
          <EmptyState
            icon={<Briefcase className="w-8 h-8 text-brand" />}
            title="Welcome! Post your first internship"
            description="Attract Pan-Atlantic University students to your organization by publishing your first open position."
            action={{
              label: "Post an Internship",
              href: "/dashboard/post",
            }}
          />
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Active Postings"
          value={internshipCount}
          icon={<Briefcase className="w-5 h-5 text-brand" />}
        />
        <StatCard
          label="Total Applicants"
          value={applicationCount}
          icon={<Users className="w-5 h-5 text-brand" />}
        />
        <StatCard
          label="Acceptance Rate"
          value={`${acceptanceRate}%`}
          change={{
            value: `${acceptedCount} accepted`,
            trend: acceptanceRate > 0 ? "up" : "neutral",
          }}
          icon={<Target className="w-5 h-5 text-brand" />}
        />
        <StatCard
          label="Pending Reviews"
          value={pendingReviews}
          icon={<Clock className="w-5 h-5 text-brand" />}
        />
      </div>
    </div>
  );
}

// --- Recent Applicants Section ---
export async function EmployerRecentApplicantsSection() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: myInternships } = await supabase
    .from("internships")
    .select("id")
    .eq("employer_id", user.id);
  const ids = myInternships?.map((i) => i.id) || [];

  if (ids.length === 0) return null;

  const { data: recentApps } = await supabase
    .from("applied_internships")
    .select(
      "*, profiles:profiles!user_id(full_name, course), internships(role)",
    )
    .in("internship_id", ids)
    .order("created_at", { ascending: false })
    .limit(5);

  let enrichedApps = recentApps || [];
  if (recentApps && recentApps.length > 0) {
    const userIds = recentApps.map((a) => a.user_id).filter(Boolean);
    const { data: liveMatches } = await supabase
      .from("match_results")
      .select("user_id, internship_id, match_score")
      .in("user_id", userIds)
      .in("internship_id", ids);

    const liveMatchMap = new Map(
      (liveMatches || []).map((m) => [
        `${m.user_id}:${m.internship_id}`,
        m.match_score,
      ]),
    );

    enrichedApps = recentApps.map((a) => {
      const live = liveMatchMap.get(`${a.user_id}:${a.internship_id}`);
      return {
        ...a,
        match_score:
          typeof live === "number" ? Math.round(live) : a.match_score,
      };
    });
  }

  return (
    <div className="space-y-4">
      <Stack
        direction="row"
        justify="between"
        align="baseline"
        className="px-1"
      >
        <Typography variant="h4" weight="bold" className="text-fg">
          New Candidates
        </Typography>
        <Link href="/dashboard/employer/internships">
          <Typography
            variant="caption"
            weight="bold"
            className="text-brand hover:underline cursor-pointer"
          >
            VIEW ALL
          </Typography>
        </Link>
      </Stack>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <EmployerActivityClient
          initialItems={enrichedApps}
          type="applicants"
        />
      </div>
    </div>
  );
}

// --- Logbook Alerts Section ---
export async function EmployerLogbookAlertsSection() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: pendingLogs } = await supabase
    .from("logbook_entries")
    .select("*, profiles!student_id(full_name)")
    .eq("employer_id", user.id)
    .eq("status", "pending")
    .order("date", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-4">
      <Stack
        direction="row"
        justify="between"
        align="baseline"
        className="px-1"
      >
        <Typography variant="h4" weight="bold" className="text-fg">
          Pending Reviews
        </Typography>
        <Link href="/dashboard/employer/logbook">
          <Typography
            variant="caption"
            weight="bold"
            className="text-brand hover:underline cursor-pointer"
          >
            MANAGE ALL
          </Typography>
        </Link>
      </Stack>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <EmployerActivityClient
          initialItems={pendingLogs || []}
          type="logbooks"
        />
      </div>
    </div>
  );
}

import EmployerInternshipListClient from "./EmployerInternshipListClient";

// --- List Section ---
export async function EmployerInternshipListSection() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: internships } = await supabase
    .from("internships")
    .select("*, applied_internships(count)")
    .eq("employer_id", user.id)
    .order("created_at", { ascending: false });

  if (!internships || internships.length === 0) {
    return (
      <EmptyState
        icon={<Briefcase className="w-8 h-8 text-brand" />}
        title="No internships posted yet"
        description="You haven't posted any internship opportunities yet. Create one to start receiving applications from students."
        action={{
          label: "Post an Internship",
          href: "/dashboard/post",
        }}
      />
    );
  }

  return <EmployerInternshipListClient initialInternships={internships} />;
}
