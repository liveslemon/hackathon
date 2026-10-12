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
  const [loading, setLoading] = useState(true);

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
        // Fall back to zeroes so user sees metrics layout rather than infinite pulse
        setMetrics({
          career_score: 0,
          ats_score: 0,
          weekly_progress: 0,
          streak_days: 0,
        });
      } finally {
        setLoading(false);
      }
    }
    void loadMetrics();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-surface-sunken rounded-2xl border border-border animate-pulse"
          />
        ))}
      </div>
    );
  }

  const activeMetrics = metrics || {
    career_score: 0,
    ats_score: 0,
    weekly_progress: 0,
    streak_days: 0,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {/* Career Score */}
      <div className="bg-surface rounded-2xl p-5 border border-border shadow-xs hover:border-border-strong transition-all flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand-subtle text-brand flex items-center justify-center shrink-0">
          <Trophy className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <Typography
            variant="caption"
            className="text-fg-muted font-medium block truncate mb-0.5"
          >
            Career Score
          </Typography>
          <Typography variant="h4" weight="bold" className="text-fg leading-tight">
            {activeMetrics.career_score ?? 0}
          </Typography>
        </div>
      </div>

      {/* ATS Score */}
      <div className="bg-surface rounded-2xl p-5 border border-border shadow-xs hover:border-border-strong transition-all flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-success-subtle text-success-fg flex items-center justify-center shrink-0">
          <Target className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <Typography
            variant="caption"
            className="text-fg-muted font-medium block truncate mb-0.5"
          >
            ATS Readiness
          </Typography>
          <Typography variant="h4" weight="bold" className="text-fg leading-tight">
            {activeMetrics.ats_score ?? 0}%
          </Typography>
        </div>
      </div>

      {/* Weekly Progress */}
      <div className="bg-surface rounded-2xl p-5 border border-border shadow-xs hover:border-border-strong transition-all flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-info-subtle text-info-fg flex items-center justify-center shrink-0">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <Typography
            variant="caption"
            className="text-fg-muted font-medium block truncate mb-0.5"
          >
            Weekly Goal
          </Typography>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-surface-sunken rounded-full overflow-hidden">
              <div
                className="h-full bg-info rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, activeMetrics.weekly_progress ?? 0))}%` }}
              />
            </div>
            <span className="text-xs font-bold text-fg shrink-0">
              {activeMetrics.weekly_progress ?? 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Career Streak */}
      <div className="bg-surface rounded-2xl p-5 border border-border shadow-xs hover:border-border-strong transition-all flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-warning-subtle text-warning-fg flex items-center justify-center shrink-0">
          <Flame className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <Typography
            variant="caption"
            className="text-fg-muted font-medium block truncate mb-0.5"
          >
            Activity Streak
          </Typography>
          <Typography variant="h4" weight="bold" className="text-fg leading-tight">
            {activeMetrics.streak_days ?? 0}{" "}
            <span className="text-xs text-fg-subtle font-normal">days</span>
          </Typography>
        </div>
      </div>
    </div>
  );
}
