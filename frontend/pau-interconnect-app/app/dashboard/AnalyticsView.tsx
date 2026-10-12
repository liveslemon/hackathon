"use client";

import React from "react";
import {
  Typography,
  Card,
  CardContent,
  Stack,
} from "@/components/ui";
import { FiBriefcase, FiUsers, FiTrendingUp } from "react-icons/fi";

export default function AnalyticsView({
  categories,
  totalApplications = 0,
  avgApplications = "0.0",
}: {
  categories: { label: string; value: number }[];
  totalApplications?: number;
  avgApplications?: string;
}) {
  const totalInternships = (categories || []).reduce((acc, cat) => acc + (cat.value || 0), 0);

  const stats = [
    {
      title: "Total Internships",
      value: totalInternships,
      icon: <FiBriefcase className="w-6 h-6" />,
      color: "bg-blue-500",
      shadow: "shadow-blue-100",
    },
    {
      title: "Total Applications",
      value: totalApplications,
      icon: <FiUsers className="w-6 h-6" />,
      color: "bg-emerald-500",
      shadow: "shadow-emerald-100",
    },
    {
      title: "Avg Applications / Role",
      value: avgApplications,
      icon: <FiTrendingUp className="w-6 h-6" />,
      color: "bg-amber-500",
      shadow: "shadow-amber-100",
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
      <Stack direction="row" spacing={6} className="flex-wrap gap-y-6">
        {stats.map((item, idx) => (
          <Card key={idx} className={`flex-1 min-w-[240px] border-slate-100 shadow-xl ${item.shadow} hover:scale-[1.02] transition-transform duration-300`}>
            <CardContent className="p-8">
              <Stack direction="row" spacing={4} align="center">
                <div className={`w-14 h-14 ${item.color} text-white rounded-2xl flex items-center justify-center shadow-lg shadow-current/20`}>
                  {item.icon}
                </div>
                <div className="space-y-1">
                  <Typography variant="body2" weight="bold" color="muted" className="uppercase tracking-widest text-[10px]">
                    {item.title}
                  </Typography>
                  <Typography variant="h2" weight="bold" className="text-slate-900">
                    {item.value}
                  </Typography>
                </div>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Card className="border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-slate-50/50 px-8 py-6 border-b border-slate-100">
          <Typography variant="h4" weight="bold">Internships by Category</Typography>
        </div>
        <CardContent className="p-8 space-y-8">
          {(!categories || categories.length === 0) ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No internship categories found. Post internships to view breakdown.
            </div>
          ) : (
            categories.map((cat, idx) => {
              const total = categories.reduce((acc, c) => acc + (c.value || 0), 0);
              const percentage = total > 0 ? ((cat.value || 0) / total) * 100 : 0;
              return (
                <div key={idx} className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <Typography variant="body1" weight="bold" className="text-slate-700">{cat.label || "Unknown"}</Typography>
                    <Typography variant="body2" weight="bold" color="primary">{cat.value || 0}</Typography>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-gradient-to-r from-brand to-brand-secondary rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}