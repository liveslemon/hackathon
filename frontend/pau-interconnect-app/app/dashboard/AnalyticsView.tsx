"use client";

import React from "react";
import {
  Typography,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  PageHeader,
  StatCard,
  EmptyState,
} from "@/components/ui";
import { Briefcase, Users, TrendingUp, PieChart, Layers } from "lucide-react";

export default function AnalyticsView({
  categories,
  totalApplications = 0,
  avgApplications = "0.0",
}: {
  categories: { label: string; value: number }[];
  totalApplications?: number;
  avgApplications?: string;
}) {
  const totalInternships = (categories || []).reduce(
    (acc, cat) => acc + (cat.value || 0),
    0,
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <PageHeader
        title="Platform Analytics"
        description="Comprehensive breakdown of active listings, student demand, and placement categories."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Internships"
          value={totalInternships}
          icon={<Briefcase className="w-5 h-5" />}
          change={{ value: "All Active & Archived", trend: "neutral" }}
        />
        <StatCard
          label="Total Applications"
          value={totalApplications}
          icon={<Users className="w-5 h-5" />}
          change={{ value: "Student Submissions", trend: "up" }}
        />
        <StatCard
          label="Avg Applications / Role"
          value={avgApplications}
          icon={<TrendingUp className="w-5 h-5" />}
          change={{ value: "Placement Liquidity", trend: "neutral" }}
        />
      </div>

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 text-primary font-medium text-xs">
            <Layers className="w-4 h-4" />
            <span>DISTRIBUTION</span>
          </div>
          <CardTitle className="text-base">Internships by Category</CardTitle>
          <CardDescription>
            Relative proportion of work models and placement disciplines.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!categories || categories.length === 0 ? (
            <EmptyState
              icon={<PieChart className="w-8 h-8" />}
              title="No Categories Available"
              description="Post internships to populate category telemetry."
            />
          ) : (
            <div className="space-y-4">
              {categories.map((cat, idx) => {
                const total = categories.reduce(
                  (acc, c) => acc + (c.value || 0),
                  0,
                );
                const percentage =
                  total > 0 ? Math.round(((cat.value || 0) / total) * 100) : 0;

                const colorTokens = [
                  "bg-[var(--chart-1)]",
                  "bg-[var(--chart-2)]",
                  "bg-[var(--chart-3)]",
                  "bg-[var(--chart-4)]",
                  "bg-[var(--chart-5)]",
                ];
                const barColor = colorTokens[idx % colorTokens.length];

                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-fg">{cat.label || "General"}</span>
                      <span className="text-muted-fg font-mono">
                        {cat.value || 0} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-3 bg-surface-sunken rounded-full overflow-hidden">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-700 ease-out`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}