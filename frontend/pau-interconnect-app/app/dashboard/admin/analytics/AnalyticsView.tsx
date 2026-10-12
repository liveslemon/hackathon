import React from "react";
import { Typography, Card, CardContent, Stack, Badge } from "@/components/ui";
import { FiBriefcase, FiUsers, FiTrendingUp } from "react-icons/fi";
import { authenticatedFetchServer } from "@/lib/api-server";
import AnalyticsCharts from "./AnalyticsCharts";

type InternshipStat = {
  title: string;
  company: string;
  category?: string;
  deadline?: string;
  applications: number;
};

type AnalyticsResponse = {
  total_internships?: number;
  total_applications?: number;
  avg_applications?: string;
  internship_stats?: InternshipStat[];
};

export default async function AnalyticsView() {
  let totalInternships = 0;
  let totalApplications = 0;
  let avgApplications = "0.0";
  let internshipStats: InternshipStat[] = [];
  let error: string | null = null;

  try {
    const data =
      await authenticatedFetchServer<AnalyticsResponse>("/admin/analytics");

    totalInternships = data.total_internships || 0;
    totalApplications = data.total_applications || 0;
    avgApplications = data.avg_applications || "0.0";
    internshipStats = data.internship_stats || [];
  } catch (e: unknown) {
    console.error("Error fetching analytics:", e);
    error = e instanceof Error ? e.message : "Failed to load analytics";
  }

  if (error) {
    return (
      <div
        role="alert"
        className="bg-danger-subtle text-danger-fg p-6 rounded-3xl border border-danger-subtle mb-8"
      >
        <Typography variant="body1" weight="bold">
          {error}
        </Typography>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <Stack direction="row" spacing={6} className="flex-wrap gap-y-6">
        <Card className="flex-1 min-w-[280px] bg-surface border border-border shadow-md">
          <CardContent className="p-8">
            <Stack direction="row" justify="between" align="center">
              <div>
                <Typography
                  variant="body2"
                  weight="bold"
                  color="muted"
                  className="uppercase tracking-widest text-[11px] mb-2"
                >
                  Total Internships
                </Typography>
                <Typography variant="h1" className="text-fg">
                  {totalInternships}
                </Typography>
              </div>
              <div className="w-14 h-14 bg-success-subtle text-success-fg rounded-2xl flex items-center justify-center">
                <FiBriefcase className="w-7 h-7" />
              </div>
            </Stack>
          </CardContent>
        </Card>

        <Card className="flex-1 min-w-[280px] bg-surface border border-border shadow-md">
          <CardContent className="p-8">
            <Stack direction="row" justify="between" align="center">
              <div>
                <Typography
                  variant="body2"
                  weight="bold"
                  color="muted"
                  className="uppercase tracking-widest text-[11px] mb-2"
                >
                  Total Applications
                </Typography>
                <Typography variant="h1" className="text-fg">
                  {totalApplications}
                </Typography>
              </div>
              <div className="w-14 h-14 bg-brand-subtle text-brand rounded-2xl flex items-center justify-center">
                <FiUsers className="w-7 h-7" />
              </div>
            </Stack>
          </CardContent>
        </Card>

        <Card className="flex-1 min-w-[280px] bg-surface border border-border shadow-md">
          <CardContent className="p-8">
            <Stack direction="row" justify="between" align="center">
              <div>
                <Typography
                  variant="body2"
                  weight="bold"
                  color="muted"
                  className="uppercase tracking-widest text-[11px] mb-2"
                >
                  Avg Applications
                </Typography>
                <Typography variant="h1" className="text-fg">
                  {avgApplications}
                </Typography>
              </div>
              <div className="w-14 h-14 bg-warning-subtle text-warning-fg rounded-2xl flex items-center justify-center">
                <FiTrendingUp className="w-7 h-7" />
              </div>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <Card className="border border-border bg-surface shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <Typography variant="h4" weight="bold" className="mb-8">
              Application Volume (Top 10 Roles)
            </Typography>
            <AnalyticsCharts internshipStats={internshipStats} />
          </CardContent>
        </Card>

        <Card className="border border-border bg-surface shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <Typography variant="h4" weight="bold" className="mb-8">
              Most Applied Internships
            </Typography>
            <div className="space-y-4">
              {(internshipStats || []).slice(0, 5).map((item, idx) => (
                <div
                  key={idx}
                  className="group p-4 bg-surface-sunken rounded-2xl border border-transparent hover:border-brand-subtle hover:bg-brand-subtle/30 transition-all duration-300"
                >
                  <Stack direction="row" align="center" justify="between">
                    <Stack direction="row" spacing={4} align="center">
                      <div className="w-10 h-10 bg-surface rounded-xl shadow-sm border border-border flex items-center justify-center font-bold text-brand">
                        {idx + 1}
                      </div>
                      <div>
                        <Typography
                          variant="body1"
                          weight="bold"
                          className="group-hover:text-brand transition-colors uppercase tracking-tight"
                        >
                          {item.title}
                        </Typography>
                        <Typography variant="caption" color="muted">
                          {item.company}
                        </Typography>
                      </div>
                    </Stack>
                    <Badge variant="primary" className="px-3 py-1.5 rounded-xl">
                      {item.applications} Apps
                    </Badge>
                  </Stack>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border bg-surface shadow-sm overflow-hidden">
        <div className="bg-surface-sunken px-6 sm:px-8 py-6 border-b border-border">
          <Typography variant="h4" weight="bold">
            Detailed Application Overview
          </Typography>
        </div>

        {/* Mobile Cards (Viewports < 768px) */}
        <div className="block md:hidden divide-y divide-border">
          {(internshipStats || []).length === 0 ? (
            <div className="p-8 text-center text-fg-subtle">
              No internship application records found.
            </div>
          ) : (
            (internshipStats || []).map((row, idx) => (
              <div key={idx} className="p-5 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Typography variant="body1" weight="bold" className="text-fg">
                      {row.title}
                    </Typography>
                    <Typography variant="caption" color="muted">
                      {row.company}
                    </Typography>
                  </div>
                  <Badge variant="primary" size="sm">
                    {row.applications} Apps
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-fg-muted pt-2 border-t border-border">
                  <span>Category: {row.category || "General"}</span>
                  <span>
                    Deadline: {row.deadline ? new Date(row.deadline).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table (Viewports >= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-sunken border-b border-border">
                <th className="px-8 py-4">
                  <Typography
                    variant="caption"
                    weight="extrabold"
                    color="muted"
                  >
                    Company
                  </Typography>
                </th>
                <th className="px-8 py-4">
                  <Typography
                    variant="caption"
                    weight="extrabold"
                    color="muted"
                  >
                    Role
                  </Typography>
                </th>
                <th className="px-8 py-4">
                  <Typography
                    variant="caption"
                    weight="extrabold"
                    color="muted"
                  >
                    Category
                  </Typography>
                </th>
                <th className="px-8 py-4">
                  <Typography
                    variant="caption"
                    weight="extrabold"
                    color="muted"
                  >
                    Deadline
                  </Typography>
                </th>
                <th className="px-8 py-4 text-center">
                  <Typography
                    variant="caption"
                    weight="extrabold"
                    color="muted"
                  >
                    Applications
                  </Typography>
                </th>
              </tr>
            </thead>
            <tbody>
              {(internshipStats || []).map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-border hover:bg-surface-sunken/50 transition-colors"
                >
                  <td className="px-8 py-5">
                    <Typography variant="body2" weight="semibold">
                      {row.company}
                    </Typography>
                  </td>
                  <td className="px-8 py-5">
                    <Typography variant="body2">{row.title}</Typography>
                  </td>
                  <td className="px-8 py-5">
                    <Badge variant="slate" size="sm">
                      {row.category}
                    </Badge>
                  </td>
                  <td className="px-8 py-5">
                    <Typography variant="body2" color="muted">
                      {row.deadline
                        ? new Date(row.deadline).toLocaleDateString()
                        : "N/A"}
                    </Typography>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <Typography
                      variant="body2"
                      weight="bold"
                      className="text-brand"
                    >
                      {row.applications}
                    </Typography>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
