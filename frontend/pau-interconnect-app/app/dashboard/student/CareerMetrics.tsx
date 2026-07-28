"use client";
import React, { useEffect, useState } from "react";
import { Typography } from "@/components/ui";
import { Target, TrendingUp, Trophy, Flame } from "lucide-react";

export default function CareerMetrics() {
  const [metrics, setMetrics] = useState<{
    career_score?: number;
    ats_score?: number;
    weekly_progress?: number;
    streak_days?: number;
  } | null>(null);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const { authenticatedFetch } = await import("@/lib/api");
        const data = await authenticatedFetch<{
          career_score?: number;
          ats_score?: number;
          weekly_progress?: number;
          streak_days?: number;
        }>("/api/analysis/metrics");
        setMetrics(data);
      } catch (e) {
        console.error("Failed to load career metrics", e);
      }
    }
    loadMetrics();
  }, []);

  if (!metrics) {
    return <div className="h-28 bg-white rounded-3xl animate-pulse mb-8" />;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {/* Career Score */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
          <Trophy className="w-6 h-6 text-indigo-500" />
        </div>
        <div>
          <Typography
            variant="body2"
            className="text-slate-400 font-semibold mb-0.5"
          >
            Career Score
          </Typography>
          <Typography variant="h4" weight="bold" className="text-slate-800">
            {metrics.career_score}
          </Typography>
        </div>
      </div>

      {/* ATS Score */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
          <Target className="w-6 h-6 text-emerald-500" />
        </div>
        <div>
          <Typography
            variant="body2"
            className="text-slate-400 font-semibold mb-0.5"
          >
            ATS Readiness
          </Typography>
          <Typography variant="h4" weight="bold" className="text-slate-800">
            {metrics.ats_score}%
          </Typography>
        </div>
      </div>

      {/* Weekly Progress */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
          <TrendingUp className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <Typography
            variant="body2"
            className="text-slate-400 font-semibold mb-0.5"
          >
            Weekly Goal
          </Typography>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden w-16">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${metrics.weekly_progress}%` }}
              />
            </div>
            <span className="text-sm font-bold text-slate-700">
              {metrics.weekly_progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Career Streak */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
          <Flame className="w-6 h-6 text-orange-500" />
        </div>
        <div>
          <Typography
            variant="body2"
            className="text-slate-400 font-semibold mb-0.5"
          >
            Activity Streak
          </Typography>
          <Typography variant="h4" weight="bold" className="text-slate-800">
            {metrics.streak_days}{" "}
            <span className="text-sm text-slate-400 font-medium">days</span>
          </Typography>
        </div>
      </div>
    </div>
  );
}
