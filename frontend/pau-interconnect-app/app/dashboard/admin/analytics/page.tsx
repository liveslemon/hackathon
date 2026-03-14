"use client";

import React, { useEffect, useState } from "react";
import {
  Typography,
  Card,
  CardContent,
  Stack,
  Badge,
} from "@/components/ui";
import { FiBriefcase, FiUsers, FiTrendingUp, FiArrowRight } from "react-icons/fi";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function AnalyticsView() {
  const [loading, setLoading] = useState(true);
  const [totalInternships, setTotalInternships] = useState(0);
  const [totalApplications, setTotalApplications] = useState(0);
  const [avgApplications, setAvgApplications] = useState("0.0");
  const [categories, setCategories] = useState<{label: string, value: number}[]>([]);
  const [internshipStats, setInternshipStats] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLiveAnalytics();
  }, []);

  const fetchLiveAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${BACKEND_URL}/admin/analytics`);
      if (!res.ok) throw new Error("Failed to fetch analytics from backend");
      
      const data = await res.json();
      
      setTotalInternships(data.total_internships);
      setTotalApplications(data.total_applications);
      setAvgApplications(data.avg_applications);
      setCategories(data.categories);
      setInternshipStats(data.internship_stats);
      
    } catch (e: any) {
      console.error("Error fetching analytics:", e);
      setError(e.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#667eea]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <Stack direction="row" spacing={6} className="flex-wrap gap-y-6">
        <Card className="flex-1 min-w-[280px] bg-gradient-to-br from-emerald-500 to-emerald-600 border-none shadow-xl shadow-emerald-100">
          <CardContent className="p-8 text-white">
            <Stack direction="row" justify="between" align="center">
              <div>
                <Typography variant="body2" weight="bold" className="uppercase tracking-widest opacity-80 mb-2">Total Internships</Typography>
                <Typography variant="h1" className="text-white">{totalInternships}</Typography>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <FiBriefcase className="w-8 h-8" />
              </div>
            </Stack>
          </CardContent>
        </Card>
        
        <Card className="flex-1 min-w-[280px] bg-gradient-to-br from-blue-500 to-blue-600 border-none shadow-xl shadow-blue-100">
          <CardContent className="p-8 text-white">
            <Stack direction="row" justify="between" align="center">
              <div>
                <Typography variant="body2" weight="bold" className="uppercase tracking-widest opacity-80 mb-2">Total Applications</Typography>
                <Typography variant="h1" className="text-white">{totalApplications}</Typography>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <FiUsers className="w-8 h-8" />
              </div>
            </Stack>
          </CardContent>
        </Card>

        <Card className="flex-1 min-w-[280px] bg-gradient-to-br from-amber-500 to-amber-600 border-none shadow-xl shadow-amber-100">
          <CardContent className="p-8 text-white">
            <Stack direction="row" justify="between" align="center">
              <div>
                <Typography variant="body2" weight="bold" className="uppercase tracking-widest opacity-80 mb-2">Avg Applications</Typography>
                <Typography variant="h1" className="text-white">{avgApplications}</Typography>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <FiTrendingUp className="w-8 h-8" />
              </div>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-8">
            <Typography variant="h4" weight="bold" className="mb-8">Internships by Category</Typography>
            <div className="space-y-6">
              {categories.map((cat, idx) => {
                const percentage = totalInternships > 0 ? (cat.value / totalInternships) * 100 : 0;
                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <Typography variant="body2" weight="bold" color="muted">{cat.label}</Typography>
                      <Typography variant="body2" weight="bold">{cat.value}</Typography>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-1000 ease-out rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm">
          <CardContent className="p-8">
            <Typography variant="h4" weight="bold" className="mb-8">Most Applied Internships</Typography>
            <div className="space-y-4">
              {internshipStats.slice(0, 5).map((item, idx) => (
                <div key={idx} className="group p-4 bg-slate-50/50 rounded-2xl border border-transparent hover:border-indigo-100 hover:bg-indigo-50/30 transition-all duration-300">
                  <Stack direction="row" align="center" justify="between">
                    <Stack direction="row" spacing={4} align="center">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center font-bold text-indigo-500">
                        {idx + 1}
                      </div>
                      <div>
                        <Typography variant="body1" weight="bold" className="group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                          {item.title}
                        </Typography>
                        <Typography variant="caption" color="muted">
                          {item.company}
                        </Typography>
                      </div>
                    </Stack>
                    <Badge variant="primary" className="px-3 py-1.5 rounded-xl">{item.applications} Apps</Badge>
                  </Stack>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-slate-50/50 px-8 py-6 border-b border-slate-100">
          <Typography variant="h4" weight="bold">Detailed Application Overview</Typography>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-4"><Typography variant="caption" weight="extrabold" color="muted">Company</Typography></th>
                <th className="px-8 py-4"><Typography variant="caption" weight="extrabold" color="muted">Role</Typography></th>
                <th className="px-8 py-4"><Typography variant="caption" weight="extrabold" color="muted">Category</Typography></th>
                <th className="px-8 py-4"><Typography variant="caption" weight="extrabold" color="muted">Deadline</Typography></th>
                <th className="px-8 py-4 text-center"><Typography variant="caption" weight="extrabold" color="muted">Applications</Typography></th>
              </tr>
            </thead>
            <tbody>
              {internshipStats.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                  <td className="px-8 py-5"><Typography variant="body2" weight="semibold">{row.company}</Typography></td>
                  <td className="px-8 py-5"><Typography variant="body2">{row.title}</Typography></td>
                  <td className="px-8 py-5">
                    <Badge variant="slate" size="sm">{row.category}</Badge>
                  </td>
                  <td className="px-8 py-5">
                    <Typography variant="body2" color="muted">
                      {row.deadline ? new Date(row.deadline).toLocaleDateString() : 'N/A'}
                    </Typography>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <Typography variant="body2" weight="bold" className="text-indigo-600">{row.applications}</Typography>
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