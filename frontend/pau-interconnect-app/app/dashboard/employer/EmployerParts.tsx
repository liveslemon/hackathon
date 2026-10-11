import { EmployerActivityClient } from "./EmployerActivityClient";
import { getSupabaseServer } from "@/lib/supabase-server";
import DashboardHeader from "@/components/DashboardHeader";
import { Typography, Stack } from "@/components/ui";
import { Briefcase, Plus, List, Edit3 } from "lucide-react";
import Link from "next/link";
import { cx } from "@/utils/cx";
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

// --- Quick Actions Toolbar ---
export function EmployerQuickActionsSection({ profile }: { profile: any }) {
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
  if (internshipsRes && internshipsRes.length > 0) {
    const { count } = await supabase
      .from("applied_internships")
      .select("*", { count: "exact", head: true })
      .in(
        "internship_id",
        internshipsRes.map((i) => i.id),
      );
    applicationCount = count || 0;
  }

  const internshipCount = internshipsRes?.length || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
      <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[160px]">
        <Typography
          variant="subtitle2"
          weight="bold"
          className="text-slate-400 uppercase tracking-widest text-[11px]"
        >
          Active Postings
        </Typography>
        <div className="flex items-baseline gap-3">
          <Typography variant="h1" className="text-slate-900 leading-none">
            {internshipCount}
          </Typography>
          <Typography variant="body2" color="muted">
            live roles
          </Typography>
        </div>
      </div>

      <div className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col justify-between min-h-[160px]">
        <Typography
          variant="subtitle2"
          weight="bold"
          className="text-slate-400 uppercase tracking-widest text-[11px]"
        >
          Total Applicants
        </Typography>
        <div className="flex items-baseline gap-3">
          <Typography variant="h1" className="text-slate-900 leading-none">
            {applicationCount}
          </Typography>
          <Typography variant="body2" color="muted">
            new talent
          </Typography>
        </div>
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

  return (
    <div className="mb-12">
      <Stack
        direction="row"
        justify="between"
        align="baseline"
        className="mb-6 px-2"
      >
        <Typography variant="h4" weight="bold" className="text-slate-800">
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

      <div className="bg-white rounded-[40px] border border-slate-100/60 overflow-hidden shadow-sm">
        <EmployerActivityClient
          initialItems={recentApps || []}
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
    <div className="mb-12">
      <Stack
        direction="row"
        justify="between"
        align="baseline"
        className="mb-6 px-2"
      >
        <Typography variant="h4" weight="bold" className="text-slate-800">
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

      <div className="bg-white rounded-[40px] border border-slate-100/60 overflow-hidden shadow-sm">
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
      <div className="p-10 bg-white border border-dashed border-slate-200 rounded-3xl text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Briefcase className="w-8 h-8 text-slate-300" />
        </div>
        <Typography variant="h6" color="muted">
          You haven&apos;t posted any internships yet.
        </Typography>
      </div>
    );
  }

  return <EmployerInternshipListClient initialInternships={internships} />;
}
