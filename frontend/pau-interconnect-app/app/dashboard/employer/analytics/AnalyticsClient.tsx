"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  Typography,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  PageHeader,
  StatCard,
  EmptyState,
} from "@/components/ui";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  Users,
  Clock,
  Target,
  Eye,
  CheckCircle,
  Briefcase,
  Plus,
  ArrowUpRight,
  Filter,
} from "lucide-react";

interface AnalyticsProps {
  internships: Array<{
    id: string;
    role: string;
    field: string;
    category: string;
    created_at: string;
    deadline?: string | null;
    status?: string;
    view_count?: number;
  }>;
  applications: Array<{
    id: string;
    status?: string | null;
    stage?: string | null;
    match_score?: number | null;
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

  const postingPerformance = useMemo(() => {
    return internships
      .map((posting) => {
        const postingApps = applications.filter(
          (a) => a.internship_id === posting.id,
        );
        return {
          ...posting,
          applicationCount: postingApps.length,
          acceptedCount: postingApps.filter(
            (a) => a.status === "accepted" || a.stage === "accepted",
          ).length,
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

  const applicationsOverTime = useMemo(() => {
    const days = 14;
    const counts: Record<string, number> = {};
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      counts[date.toISOString().split("T")[0]] = 0;
    }
    applications.forEach((app) => {
      const date = app.created_at.split("T")[0];
      if (counts[date] !== undefined) counts[date]++;
    });
    return Object.entries(counts).map(([date, count]) => {
      const d = new Date(date);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return { date, label, applications: count };
    });
  }, [applications]);

  const funnelStages = useMemo(() => {
    const totalViews = metrics.totalViews;
    const totalApplications = metrics.totalApplications;
    const reviewed = applications.filter((a) => a.stage !== "applied").length;
    const shortlisted = applications.filter((a) =>
      ["shortlisted", "interview", "offered", "accepted"].includes(
        a.stage || "",
      ),
    ).length;
    const accepted = metrics.accepted;

    return [
      { label: "Views", count: totalViews, pct: totalViews > 0 ? "100%" : "0%" },
      {
        label: "Applied",
        count: totalApplications,
        pct: totalViews > 0 ? `${Math.round((totalApplications / totalViews) * 100)}%` : "0%",
      },
      {
        label: "Reviewed",
        count: reviewed,
        pct: totalApplications > 0 ? `${Math.round((reviewed / totalApplications) * 100)}%` : "0%",
      },
      {
        label: "Shortlisted",
        count: shortlisted,
        pct: totalApplications > 0 ? `${Math.round((shortlisted / totalApplications) * 100)}%` : "0%",
      },
      {
        label: "Accepted",
        count: accepted,
        pct: totalApplications > 0 ? `${Math.round((accepted / totalApplications) * 100)}%` : "0%",
      },
    ];
  }, [metrics, applications]);

  if (internships.length === 0) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <PageHeader
          title="Recruitment Analytics"
          description="Performance insights, candidate engagement, and recruitment pipeline telemetry."
          actions={
            <Link href="/dashboard/post">
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Post First Internship
              </Button>
            </Link>
          }
        />
        <EmptyState
          icon={<Briefcase className="w-8 h-8" />}
          title="No recruitment data yet"
          description="Once you publish an internship posting, you will see view counts, applicant velocity, candidate match rates, and recruitment funnel insights here."
          action={{
            label: "Create First Role",
            href: "/dashboard/post",
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="Recruitment Analytics"
        description="Performance insights, candidate engagement, and recruitment pipeline telemetry."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/employer/reports">
              <Button variant="outline" size="sm" className="gap-2">
                Export Reports
              </Button>
            </Link>
            <Link href="/dashboard/post">
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Post New Role
              </Button>
            </Link>
          </div>
        }
      />

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Impressions"
          value={metrics.totalViews}
          icon={<Eye className="w-5 h-5" />}
          change={{ value: `${metrics.viewToApplyRate}% applied`, trend: "up" }}
        />
        <StatCard
          label="Candidate Applications"
          value={metrics.totalApplications}
          icon={<Users className="w-5 h-5" />}
          change={{ value: `${metrics.pending} pending`, trend: "neutral" }}
        />
        <StatCard
          label="Placement Rate"
          value={`${metrics.acceptanceRate}%`}
          icon={<Target className="w-5 h-5" />}
          change={{ value: `${metrics.accepted} accepted`, trend: "up" }}
        />
        <StatCard
          label="Average Match Score"
          value={`${metrics.avgMatchScore}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          change={{ value: "PAU Vector Algorithm", trend: "neutral" }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Application Velocity Chart */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">Applicant Velocity (Last 14 Days)</CardTitle>
            <CardDescription>
              Volume of student applications submitted across your active postings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={applicationsOverTime}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border)"
                  />
                  <XAxis
                    dataKey="label"
                    stroke="var(--fg-muted)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--fg-muted)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surface-raised)",
                      borderColor: "var(--border)",
                      color: "var(--fg)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="applications"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorApps)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recruitment Funnel */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-base">Recruitment Pipeline Funnel</CardTitle>
            <CardDescription>
              Conversion rates across the candidate consideration stages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-2">
              {funnelStages.map((stage) => {
                const maxCount = Math.max(...funnelStages.map((s) => s.count), 1);
                const widthPercent = Math.max(6, Math.round((stage.count / maxCount) * 100));

                return (
                  <div key={stage.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-fg">{stage.label}</span>
                      <span className="text-muted-fg">
                        {stage.count} <span className="text-[11px] opacity-75">({stage.pct})</span>
                      </span>
                    </div>
                    <div className="h-3 w-full bg-surface-sunken rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500 rounded-full"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role-by-Role Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role Performance Breakdown</CardTitle>
          <CardDescription>
            Comparison of view volumes, applicant yield, and candidate match quality per role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-fg font-medium">
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider">Role Title</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider">Track</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-right">Views</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-right">Applications</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-right">Accepted</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-right">Avg Match</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {postingPerformance.map((posting) => (
                  <tr key={posting.id} className="hover:bg-canvas/50 transition-colors">
                    <td className="py-3.5 font-medium text-fg">
                      {posting.role}
                    </td>
                    <td className="py-3.5 text-muted-fg">
                      {posting.field || "General"}
                    </td>
                    <td className="py-3.5 text-right text-muted-fg font-mono">
                      {posting.view_count || 0}
                    </td>
                    <td className="py-3.5 text-right font-medium text-fg font-mono">
                      {posting.applicationCount}
                    </td>
                    <td className="py-3.5 text-right text-success-fg font-medium font-mono">
                      {posting.acceptedCount}
                    </td>
                    <td className="py-3.5 text-right text-fg font-mono">
                      {posting.avgScore > 0 ? `${posting.avgScore}%` : "—"}
                    </td>
                    <td className="py-3.5 text-right">
                      <Link
                        href={`/dashboard/employer/internships/${posting.id}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                      >
                        Review
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

