# NEW FEATURE: Employer Analytics Dashboard

## Priority: 🟡 MEDIUM

## Effort: Medium (4-5 hours)

## Overview

Dedicated analytics page for employers showing recruitment funnel metrics, posting performance, time-to-fill, and applicant demographics. Helps employers understand what's working and where to improve.

## Implementation

### 1. Page: `app/dashboard/employer/analytics/page.tsx`

```tsx
import { getSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { EmployerAnalyticsClient } from "./AnalyticsClient";

export default async function EmployerAnalyticsPage() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login/employer");

  // Fetch aggregated data server-side
  const { data: internships } = await supabase
    .from("internships")
    .select(
      "id, role, field, category, created_at, deadline, status, view_count",
    )
    .eq("employer_id", user.id);

  const internshipIds = internships?.map((i) => i.id) || [];

  const { data: applications } = await supabase
    .from("applied_internships")
    .select("id, status, stage, match_score, created_at, internship_id")
    .in("internship_id", internshipIds);

  return (
    <EmployerAnalyticsClient
      internships={internships || []}
      applications={applications || []}
    />
  );
}
```

### 2. Client Component: `app/dashboard/employer/analytics/AnalyticsClient.tsx`

```tsx
"use client";
import React, { useMemo } from "react";
import { Typography, Card, CardContent } from "@/components/ui";
import {
  TrendingUp,
  Users,
  Clock,
  Target,
  Eye,
  CheckCircle,
} from "lucide-react";

interface AnalyticsProps {
  internships: Array<{
    id: string;
    role: string;
    field: string;
    category: string;
    created_at: string;
    deadline?: string;
    status?: string;
    view_count?: number;
  }>;
  applications: Array<{
    id: string;
    status?: string;
    stage?: string;
    match_score?: number;
    created_at: string;
    internship_id: string;
  }>;
}

export function EmployerAnalyticsClient({
  internships,
  applications,
}: AnalyticsProps) {
  const metrics = useMemo(() => {
    const totalPostings = internships.length;
    const activePostings = internships.filter(
      (i) => i.status !== "closed",
    ).length;
    const totalApplications = applications.length;
    const accepted = applications.filter(
      (a) => a.status === "accepted" || a.stage === "accepted",
    ).length;
    const rejected = applications.filter(
      (a) => a.status === "rejected" || a.stage === "rejected",
    ).length;
    const pending = totalApplications - accepted - rejected;
    const acceptanceRate =
      totalApplications > 0
        ? Math.round((accepted / totalApplications) * 100)
        : 0;
    const avgMatchScore =
      applications.length > 0
        ? Math.round(
            applications.reduce((sum, a) => sum + (a.match_score || 0), 0) /
              applications.length,
          )
        : 0;
    const totalViews = internships.reduce(
      (sum, i) => sum + (i.view_count || 0),
      0,
    );
    const viewToApplyRate =
      totalViews > 0 ? Math.round((totalApplications / totalViews) * 100) : 0;

    return {
      totalPostings,
      activePostings,
      totalApplications,
      accepted,
      rejected,
      pending,
      acceptanceRate,
      avgMatchScore,
      totalViews,
      viewToApplyRate,
    };
  }, [internships, applications]);

  // Per-posting performance
  const postingPerformance = useMemo(() => {
    return internships
      .map((posting) => {
        const postingApps = applications.filter(
          (a) => a.internship_id === posting.id,
        );
        return {
          ...posting,
          applicationCount: postingApps.length,
          acceptedCount: postingApps.filter((a) => a.status === "accepted")
            .length,
          avgScore:
            postingApps.length > 0
              ? Math.round(
                  postingApps.reduce((s, a) => s + (a.match_score || 0), 0) /
                    postingApps.length,
                )
              : 0,
        };
      })
      .sort((a, b) => b.applicationCount - a.applicationCount);
  }, [internships, applications]);

  // Applications over time (last 30 days)
  const applicationsOverTime = useMemo(() => {
    const days = 30;
    const counts: Record<string, number> = {};
    const now = new Date();
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      counts[date.toISOString().split("T")[0]] = 0;
    }
    applications.forEach((app) => {
      const date = app.created_at.split("T")[0];
      if (counts[date] !== undefined) counts[date]++;
    });
    return Object.entries(counts)
      .reverse()
      .map(([date, count]) => ({ date, count }));
  }, [applications]);

  return (
    <div className="space-y-8">
      <div>
        <Typography variant="h2" weight="bold">
          Recruitment Analytics
        </Typography>
        <Typography variant="body1" color="muted">
          Track your hiring performance
        </Typography>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<Eye />}
          label="Total Views"
          value={metrics.totalViews}
        />
        <MetricCard
          icon={<Users />}
          label="Total Applications"
          value={metrics.totalApplications}
        />
        <MetricCard
          icon={<Target />}
          label="Acceptance Rate"
          value={`${metrics.acceptanceRate}%`}
        />
        <MetricCard
          icon={<TrendingUp />}
          label="Avg Match Score"
          value={`${metrics.avgMatchScore}%`}
        />
        <MetricCard
          icon={<CheckCircle />}
          label="Accepted"
          value={metrics.accepted}
        />
        <MetricCard icon={<Clock />} label="Pending" value={metrics.pending} />
        <MetricCard
          label="View→Apply Rate"
          value={`${metrics.viewToApplyRate}%`}
        />
        <MetricCard label="Active Postings" value={metrics.activePostings} />
      </div>

      {/* Applications Over Time Chart */}
      <Card>
        <CardContent className="p-6">
          <Typography variant="h4" weight="bold" className="mb-4">
            Applications (Last 30 Days)
          </Typography>
          <div className="h-40 flex items-end gap-1">
            {applicationsOverTime.map((day) => (
              <div
                key={day.date}
                className="flex-1 flex flex-col items-center justify-end"
              >
                <div
                  className="w-full bg-brand/80 rounded-t"
                  style={{
                    height: `${Math.max(4, (day.count / Math.max(...applicationsOverTime.map((d) => d.count), 1)) * 100)}%`,
                  }}
                  title={`${day.date}: ${day.count} applications`}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Posting Performance Table */}
      <Card>
        <CardContent className="p-6">
          <Typography variant="h4" weight="bold" className="mb-4">
            Posting Performance
          </Typography>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Applications</th>
                  <th className="pb-3 font-medium">Accepted</th>
                  <th className="pb-3 font-medium">Avg Match</th>
                  <th className="pb-3 font-medium">Views</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {postingPerformance.map((posting) => (
                  <tr key={posting.id}>
                    <td className="py-3 font-medium">{posting.role}</td>
                    <td className="py-3">{posting.applicationCount}</td>
                    <td className="py-3">{posting.acceptedCount}</td>
                    <td className="py-3">{posting.avgScore}%</td>
                    <td className="py-3">{posting.view_count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Funnel Visualization */}
      <Card>
        <CardContent className="p-6">
          <Typography variant="h4" weight="bold" className="mb-4">
            Recruitment Funnel
          </Typography>
          <FunnelChart
            stages={[
              { label: "Views", count: metrics.totalViews },
              { label: "Applications", count: metrics.totalApplications },
              {
                label: "Reviewed",
                count: applications.filter((a) => a.stage !== "applied").length,
              },
              {
                label: "Shortlisted",
                count: applications.filter((a) =>
                  ["shortlisted", "interview", "offered", "accepted"].includes(
                    a.stage || "",
                  ),
                ).length,
              },
              { label: "Accepted", count: metrics.accepted },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        {icon && <div className="text-brand">{icon}</div>}
        <div>
          <Typography variant="h4" weight="bold">
            {value}
          </Typography>
          <Typography variant="caption" color="muted">
            {label}
          </Typography>
        </div>
      </div>
    </Card>
  );
}

function FunnelChart({
  stages,
}: {
  stages: Array<{ label: string; count: number }>;
}) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1);
  return (
    <div className="space-y-3">
      {stages.map((stage, i) => (
        <div key={stage.label} className="flex items-center gap-4">
          <span className="w-24 text-sm text-slate-600">{stage.label}</span>
          <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden">
            <div
              className="h-full bg-brand/70 rounded-lg flex items-center px-3"
              style={{ width: `${(stage.count / maxCount) * 100}%` }}
            >
              <span className="text-xs font-bold text-white">
                {stage.count}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Integration with Other Roles

- **Student**: Student dashboard could show personal analytics (application success rate, profile completeness)
- **Admin**: Admin analytics aggregates across all employers (total applications platform-wide, top employers, etc.)
- **Sidebar**: Analytics link added to employer sidebar (see task #012)

## Acceptance Criteria

- [ ] Analytics page at `/dashboard/employer/analytics`
- [ ] 8 key metric cards (views, applications, acceptance rate, match score, etc.)
- [ ] Applications over time bar chart (last 30 days)
- [ ] Per-posting performance table (sortable)
- [ ] Recruitment funnel visualization
- [ ] Data fetched server-side for performance
- [ ] Sidebar nav item links to analytics page
- [ ] Empty state for new employers with no data


STATUS: COMPLETE
