"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsChartsProps {
  internshipStats: Array<{
    title: string;
    applications: number;
  }>;
}

export default function AnalyticsCharts({
  internshipStats,
}: AnalyticsChartsProps) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={(internshipStats || []).slice(0, 10)}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--border)"
          />
          <XAxis
            dataKey="title"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "var(--fg-muted)" }}
            tickFormatter={(value) =>
              value && value.length > 15
                ? value.substring(0, 15) + "..."
                : value
            }
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "var(--fg-muted)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-sunken)" }}
            contentStyle={{
              backgroundColor: "var(--surface-raised)",
              color: "var(--fg)",
              borderColor: "var(--border)",
              borderRadius: "16px",
              boxShadow: "var(--shadow-lg)",
            }}
            itemStyle={{ color: "var(--fg)" }}
            labelStyle={{ color: "var(--fg)", fontWeight: 600 }}
          />
          <Bar
            dataKey="applications"
            fill="var(--brand)"
            radius={[6, 6, 0, 0]}
            barSize={40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
