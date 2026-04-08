"use client";

import { useState, useEffect } from "react";
import {
  Typography,
  Card,
  CardContent,
} from "@/components/ui";
import { FiUsers, FiBriefcase, FiFileText, FiCalendar, FiUserPlus, FiActivity } from "react-icons/fi";

interface Stats {
  total_students: number;
  total_employers: number;
  total_internships: number;
  total_applications: number;
  applications_today: number;
  new_users_today: number;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const metricCards = [
  {
    key: "total_students" as keyof Stats,
    label: "Total Students",
    icon: <FiUsers className="w-8 h-8" />,
    color: "text-blue-500",
    bg: "bg-blue-50/50",
    border: "border-blue-100",
    accent: "bg-blue-500",
  },
  {
    key: "total_employers" as keyof Stats,
    label: "Total Employers",
    icon: <FiBriefcase className="w-8 h-8" />,
    color: "text-purple-500",
    bg: "bg-purple-50/50",
    border: "border-purple-100",
    accent: "bg-purple-500",
  },
  {
    key: "total_internships" as keyof Stats,
    label: "Internships Posted",
    icon: <FiActivity className="w-8 h-8" />,
    color: "text-rose-500",
    bg: "bg-rose-50/50",
    border: "border-rose-100",
    accent: "bg-rose-500",
  },
  {
    key: "total_applications" as keyof Stats,
    label: "Total Applications",
    icon: <FiFileText className="w-8 h-8" />,
    color: "text-cyan-500",
    bg: "bg-cyan-50/50",
    border: "border-cyan-100",
    accent: "bg-cyan-500",
  },
  {
    key: "applications_today" as keyof Stats,
    label: "Applications Today",
    icon: <FiCalendar className="w-8 h-8" />,
    color: "text-emerald-500",
    bg: "bg-emerald-50/50",
    border: "border-emerald-100",
    accent: "bg-emerald-500",
  },
  {
    key: "new_users_today" as keyof Stats,
    label: "New Users Today",
    icon: <FiUserPlus className="w-8 h-8" />,
    color: "text-amber-500",
    bg: "bg-amber-50/50",
    border: "border-amber-100",
    accent: "bg-amber-500",
  },
];

export default function OverviewView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/admin/stats`);
        if (!res.ok) throw new Error("Failed to fetch stats");
        const data: Stats = await res.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-6 rounded-3xl border border-red-100 mb-8">
        <Typography variant="body1" weight="bold">{error}</Typography>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Typography variant="h3" weight="bold">Platform Overview</Typography>
        <div className="px-4 py-2 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <Typography variant="caption" weight="bold" color="muted">Live Dashboard</Typography>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {metricCards.map((card, index) => (
          <div 
            key={card.key}
            className="animate-in fade-in slide-in-from-bottom-8 fill-mode-both h-full"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <Card className="group h-full transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-100 border-slate-100 overflow-hidden">
            <CardContent className={`p-8 ${card.bg} h-full relative`}>
              {/* Decorative accent */}
              <div className={`absolute top-0 right-0 w-32 h-32 ${card.accent} opacity-[0.03] rounded-bl-full transform translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform duration-500`} />
              
              <div className="relative z-10 space-y-6">
                <div className={`w-14 h-14 ${card.accent} text-white rounded-2xl flex items-center justify-center shadow-lg shadow-current/20 group-hover:scale-110 transition-transform duration-300`}>
                  {card.icon}
                </div>

                <div className="space-y-1">
                  <Typography variant="h1" weight="extrabold" className="text-slate-900 tracking-tight">
                    {stats?.[card.key]?.toLocaleString() ?? 0}
                  </Typography>
                  <Typography variant="body2" weight="bold" color="muted" className="uppercase tracking-widest text-[10px]">
                    {card.label}
                  </Typography>
                </div>
              </div>
            </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
