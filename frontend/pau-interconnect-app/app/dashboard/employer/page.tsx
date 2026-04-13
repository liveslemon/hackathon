import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crossFetch from "cross-fetch";
import { Suspense } from "react";
import { Skeleton, Typography, Stack, Divider } from "@/components/ui";
import { 
  EmployerStatsSection, 
  EmployerQuickActionsSection,
  EmployerRecentApplicantsSection,
  EmployerLogbookAlertsSection
} from "./EmployerParts";
import DashboardShellWrapper from "./DashboardShellWrapper";
import { getSupabaseServer } from "@/lib/supabase-server";

export const revalidate = 0; // Fresh dashboard data

export default async function EmployerDashboardPage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login/employer");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
    
  if (!profile || profile.role !== "employer") redirect("/");

  return (
    <DashboardShellWrapper userProfile={profile}>
      <main className="max-w-6xl mx-auto py-12 px-6">
        {/* 1. Integrated Header Context */}
        <div className="mb-12">
          <Typography variant="h2" weight="bold" className="text-slate-900 tracking-tight mb-1">Recruitment Overview</Typography>
          <Typography variant="body1" className="text-slate-500 font-medium">
            Managing <span className="text-brand font-bold">{profile.company_name}</span>'s activity.
          </Typography>
        </div>

        {/* 2. Streamlined Toolbar (Instant) */}
        <EmployerQuickActionsSection profile={profile} />

        {/* 3. Core Metrics (Streaming) */}
        <Suspense fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
            {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-[160px] rounded-[32px]" />)}
          </div>
        }>
          <EmployerStatsSection />
        </Suspense>

        <Divider className="my-12 opacity-50" />

        {/* 4. Live Activity Feeds (Streaming) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Suspense fallback={
            <div className="space-y-6">
              <div className="h-8 w-48 bg-slate-100 rounded-xl animate-pulse mb-6 ml-2" />
              <div className="h-[400px] w-full bg-slate-50/50 rounded-[40px] animate-pulse" />
            </div>
          }>
            <EmployerRecentApplicantsSection />
          </Suspense>

          <Suspense fallback={
            <div className="space-y-6">
              <div className="h-8 w-48 bg-slate-100 rounded-xl animate-pulse mb-6 ml-2" />
              <div className="h-[400px] w-full bg-slate-50/50 rounded-[40px] animate-pulse" />
            </div>
          }>
            <EmployerLogbookAlertsSection />
          </Suspense>
        </div>
      </main>
    </DashboardShellWrapper>
  );
}
