"use client";
import React, { useState, useEffect } from "react";
import { Typography, Button } from "@/components/ui";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Target,
  Clock,
  Zap,
} from "lucide-react";
import { cx } from "@/utils/cx";

type TargetJob = { id: string; role: string; company: string };

type SkillGapAnalysis = {
  match_percentage?: number;
  match_source?: "platform" | "ai_estimate";
  strengths_summary?: string;
  recommendations?: string[];
  current_skills?: string[];
  missing_skills?: Array<{
    skill: string;
    priority?: "High" | "Medium" | "Low" | string;
    why?: string;
    estimated_learning_time?: string;
    resource?: string;
  }>;
};

function sanitizeSearch(q: string): string {
  return q.replace(/[,()%*\\]/g, " ").trim();
}

export default function SkillGapClient() {
  const [internships, setInternships] = useState<TargetJob[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [analysis, setAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [suggestions, setSuggestions] = useState<
    Array<TargetJob & { match_score: number }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/lib/supabaseClient");
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return;
      const { data } = await supabase
        .from("match_results")
        .select("match_score, internships(id, role, company, status, deadline)")
        .eq("user_id", userId)
        .order("match_score", { ascending: false })
        .limit(12);
      const now = Date.now();
      const open = (data || [])
        .map((row) => {
          const job = (Array.isArray(row.internships)
            ? row.internships[0]
            : row.internships) as
            | (TargetJob & { status?: string; deadline?: string | null })
            | null;
          return job && typeof row.match_score === "number"
            ? { ...job, match_score: Math.round(row.match_score) }
            : null;
        })
        .filter(
          (j): j is TargetJob & { match_score: number; status?: string; deadline?: string | null } =>
            Boolean(j) &&
            (j!.status ?? "active") === "active" &&
            (!j!.deadline || Date.parse(j!.deadline) >= now),
        )
        .slice(0, 4);
      setSuggestions(open);
    })();
  }, []);

  useEffect(() => {
    const q = sanitizeSearch(searchQuery);
    if (q.length < 2) {
      setInternships([]);
      setShowDropdown(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const { supabase } = await import("@/lib/supabaseClient");
        const { data } = await supabase
          .from("internships")
          .select("id, role, company, deadline")
          .eq("status", "active")
          .or(`role.ilike.%${q}%,company.ilike.%${q}%`)
          .order("created_at", { ascending: false })
          .limit(20);

        const now = Date.now();
        const jobs = (data || [])
          .filter(
            (j) =>
              Boolean(j.id && j.role && j.company) &&
              (!j.deadline || Date.parse(j.deadline) >= now),
          )
          .slice(0, 10) as TargetJob[];
        setInternships(jobs);
        setShowDropdown(true);
      } catch {
        setInternships([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const handleSelect = (job: { id: string; role: string; company: string }) => {
    setSelectedId(job.id);
    setSelectedLabel(`${job.role} at ${job.company}`);
    setSearchQuery(`${job.role} at ${job.company}`);
    setShowDropdown(false);
  };

  const analyzeGap = async () => {
    if (!selectedId) return;
    setLoading(true);
    setError("");
    setAnalysis(null);
    try {
      const { authenticatedFetch, backendUrl } = await import("@/lib/api");
      const data = await authenticatedFetch<SkillGapAnalysis>(
        backendUrl(`/api/analysis/skill-gap?internship_id=${selectedId}`),
        {},
        45000,
      );
      setAnalysis(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-t border-border pt-8">
        <Typography variant="h4" weight="bold" className="text-fg leading-tight">
          Skill Gap Analysis
        </Typography>
        <Typography variant="body2" className="text-fg-muted mt-1">
          Evaluate your resume against target postings to identify high-impact missing skills.
        </Typography>
      </div>

      <div className="bg-surface rounded-2xl p-6 md:p-8 border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full relative">
            <label className="block text-xs font-semibold text-fg mb-2">
              Select or Search Target Role
            </label>
            <input
              type="text"
              className="w-full h-11 px-4 rounded-xl border border-border focus:ring-2 focus:ring-focus-ring focus:border-brand transition-all bg-surface-sunken text-fg text-sm placeholder:text-fg-subtle"
              placeholder="Search by role or company name..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (selectedLabel && e.target.value !== selectedLabel) {
                  setSelectedId("");
                  setSelectedLabel("");
                }
              }}
              onFocus={() => {
                if (internships.length > 0 || searchQuery.trim().length >= 2) {
                  setShowDropdown(true);
                }
              }}
            />
            {searching && (
              <div className="absolute right-4 top-[38px]">
                <Loader2 className="w-4 h-4 animate-spin text-brand" />
              </div>
            )}
            {showDropdown && (
              <div className="absolute z-20 left-0 right-0 top-full mt-1.5 bg-surface-raised border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {internships.length > 0 ? (
                  internships.map((job) => (
                    <button
                      key={job.id}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-surface-sunken transition-colors border-b border-border last:border-0 cursor-pointer"
                      onClick={() => handleSelect(job)}
                    >
                      <span className="font-semibold text-fg text-sm">
                        {job.role}
                      </span>
                      <span className="text-fg-muted text-xs ml-2">
                        at {job.company}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-fg-muted text-center">
                    No active internships found
                  </div>
                )}
              </div>
            )}
          </div>
          <Button
            onClick={analyzeGap}
            disabled={!selectedId || loading}
            colorType="primary"
            className="h-11 px-6 rounded-xl shadow-xs w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...
              </>
            ) : (
              "Run Diagnostics"
            )}
          </Button>
        </div>

        {suggestions.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-fg-subtle mb-2 uppercase tracking-wider">
              Quick Select From Your Top Matches
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => handleSelect(job)}
                  className={cx(
                    "px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer",
                    selectedId === job.id
                      ? "bg-brand text-fg-inverse border-brand shadow-xs"
                      : "bg-surface-sunken text-fg-muted border-border hover:border-brand/40 hover:text-fg",
                  )}
                >
                  <span>{job.role} · {job.company}</span>
                  <span className="opacity-80 ml-1.5 font-bold">{job.match_score}%</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-danger-subtle border border-danger/20 text-danger-fg rounded-xl text-xs">
            {error}
          </div>
        )}
      </div>

      {analysis && (
        <div className="space-y-6 animate-in fade-in duration-500">
          {(() => {
            const matchPercentage =
              typeof analysis.match_percentage === "number"
                ? Math.round(analysis.match_percentage)
                : null;
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface rounded-2xl p-6 md:p-8 border border-border shadow-xs flex flex-col items-center justify-center text-center">
                  <div
                    className={cx(
                      "w-28 h-28 rounded-full border-4 flex items-center justify-center mb-4 transition-all",
                      matchPercentage !== null && matchPercentage >= 70
                        ? "border-success text-success-fg bg-success-subtle/30"
                        : matchPercentage !== null && matchPercentage >= 40
                          ? "border-warning text-warning-fg bg-warning-subtle/30"
                          : "border-border text-fg-muted bg-surface-sunken",
                    )}
                  >
                    <Typography variant="h2" weight="bold">
                      {matchPercentage !== null ? `${matchPercentage}%` : "--%"}
                    </Typography>
                  </div>
                  <Typography
                    variant="h5"
                    weight="bold"
                    className="text-fg"
                  >
                    Compatibility Score
                  </Typography>
                  <Typography variant="caption" className="text-fg-muted mt-1">
                    {matchPercentage !== null
                      ? "Calculated against target requirements"
                      : "Score pending"}
                  </Typography>
                  {analysis.strengths_summary && (
                    <Typography variant="body2" className="text-fg-muted mt-3 text-xs leading-relaxed">
                      {analysis.strengths_summary}
                    </Typography>
                  )}
                </div>

                <div className="md:col-span-2 bg-surface rounded-2xl p-6 md:p-8 border border-border shadow-xs">
                  <Typography
                    variant="h5"
                    weight="bold"
                    className="text-fg mb-4 flex items-center gap-2"
                  >
                    <Target className="w-5 h-5 text-brand" /> Action Recommendations
                  </Typography>
                  <ul className="space-y-3">
                    {analysis.recommendations?.map(
                      (rec: string, idx: number) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 bg-surface-sunken p-3.5 rounded-xl border border-border"
                        >
                          <Zap className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                          <span className="text-fg text-xs leading-relaxed">
                            {rec}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            );
          })()}

          <div className="bg-surface rounded-2xl p-6 md:p-8 border border-border shadow-xs">
            <Typography
              variant="h5"
              weight="bold"
              className="text-fg mb-6"
            >
              Skill Diagnostic Breakdown
            </Typography>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <Typography
                  variant="h6"
                  weight="bold"
                  className="text-fg mb-3 flex items-center gap-2 text-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-success-fg" /> Verified Profile Skills
                </Typography>
                <div className="flex flex-wrap gap-2">
                  {analysis.current_skills?.map((s: string, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-success-subtle border border-success/20 text-success-fg rounded-full text-xs font-semibold"
                    >
                      {s}
                    </span>
                  ))}
                  {(!analysis.current_skills ||
                    analysis.current_skills.length === 0) && (
                    <span className="text-fg-subtle text-xs italic">
                      No matching verified skills detected in profile.
                    </span>
                  )}
                </div>
              </div>

              <div>
                <Typography
                  variant="h6"
                  weight="bold"
                  className="text-fg mb-3 flex items-center gap-2 text-sm"
                >
                  <XCircle className="w-4 h-4 text-danger-fg" /> Missing Role Keywords
                </Typography>
                <div className="space-y-3">
                  {analysis.missing_skills?.map((ms, i: number) => (
                    <div
                      key={i}
                      className="p-3.5 bg-surface-sunken border border-border rounded-xl"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-fg text-xs">
                          {ms.skill}
                        </span>
                        <span
                          className={cx(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold border",
                            ms.priority === "High"
                              ? "bg-danger-subtle text-danger-fg border-danger/20"
                              : ms.priority === "Medium"
                                ? "bg-warning-subtle text-warning-fg border-warning/20"
                                : "bg-surface text-fg-muted border-border",
                          )}
                        >
                          {ms.priority} Priority
                        </span>
                      </div>
                      {ms.estimated_learning_time && (
                        <div className="flex items-center gap-1.5 text-[11px] text-fg-subtle mt-1.5">
                          <Clock className="w-3 h-3" />
                          <span>Est. learning time: {ms.estimated_learning_time}</span>
                        </div>
                      )}
                      {ms.why && (
                        <p className="text-xs text-fg-muted mt-1 leading-relaxed">{ms.why}</p>
                      )}
                      {ms.resource && (
                        <p className="text-xs text-brand mt-1 font-medium">
                          Suggested resource: {ms.resource}
                        </p>
                      )}
                    </div>
                  ))}
                  {(!analysis.missing_skills ||
                    analysis.missing_skills.length === 0) && (
                    <span className="text-success-fg text-xs font-medium">
                      Congratulations! You have all the primary required keywords.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
