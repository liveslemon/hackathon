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

// PostgREST .or() filters are comma/paren-delimited; strip characters that
// would break (or inject into) the filter expression.
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

  // Suggest the student's best-matching open internships so they don't have
  // to search for a target role.
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

  // Debounced search: query Supabase with text filter
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
        45000, // LLM call with provider fallback
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
      <div className="border-t border-slate-200 pt-8">
        <Typography variant="h4" weight="bold" className="text-slate-800">
          Skill Gap Analysis
        </Typography>
        <Typography variant="body2" className="text-slate-500 mt-1">
          Compare your resume against your target roles to see what you&apos;re
          missing.
        </Typography>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full relative">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Search for a role
            </label>
            <input
              type="text"
              className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-brand/20 focus:border-brand transition-all bg-slate-50 text-slate-700"
              placeholder="Type a role or company name..."
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
              <div className="absolute right-4 top-[42px]">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            )}
            {showDropdown && (
              <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {internships.length > 0 ? (
                  internships.map((job) => (
                    <button
                      key={job.id}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                      onClick={() => handleSelect(job)}
                    >
                      <span className="font-medium text-slate-800 text-sm">
                        {job.role}
                      </span>
                      <span className="text-slate-400 text-sm ml-2">
                        at {job.company}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-400 text-center">
                    No active internships found
                  </div>
                )}
              </div>
            )}
          </div>
          <Button
            onClick={analyzeGap}
            disabled={!selectedId || loading}
            className="h-12 px-8 bg-brand hover:bg-brand/90 text-white rounded-xl shadow-sm w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analyzing...
              </>
            ) : (
              "Run Analysis"
            )}
          </Button>
        </div>
        {suggestions.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-slate-500 mb-2">
              Or pick one of your top matches
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => handleSelect(job)}
                  className={cx(
                    "px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                    selectedId === job.id
                      ? "bg-brand text-white border-brand"
                      : "bg-white text-slate-600 border-slate-200 hover:border-brand/40",
                  )}
                >
                  {job.role} · {job.company}{" "}
                  <span className="opacity-70">{job.match_score}%</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}
      </div>

      {analysis && (
        <div className="space-y-6 animate-in fade-in duration-700">
          {(() => {
            const matchPercentage =
              typeof analysis.match_percentage === "number"
                ? Math.round(analysis.match_percentage)
                : null;
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-[32px] p-8 border border-slate-100/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center">
                  <div
                    className="w-32 h-32 rounded-full border-8 flex items-center justify-center mb-4"
                    style={{
                      borderColor:
                        matchPercentage !== null && matchPercentage > 70
                          ? "#10b981"
                          : matchPercentage !== null && matchPercentage > 40
                            ? "#f59e0b"
                            : "#94a3b8",
                    }}
                  >
                    <Typography variant="h1" className="text-slate-800">
                      {matchPercentage !== null ? `${matchPercentage}%` : "--%"}
                    </Typography>
                  </div>
                  <Typography
                    variant="h5"
                    weight="bold"
                    className="text-slate-700"
                  >
                    Match Score
                  </Typography>
                  <Typography variant="body2" className="text-slate-400 mt-1">
                    {matchPercentage !== null
                      ? "Canonical score matching your internship listing"
                      : "No score available yet"}
                  </Typography>
                  {analysis.strengths_summary && (
                    <Typography variant="body2" className="text-slate-600 mt-4">
                      {analysis.strengths_summary}
                    </Typography>
                  )}
                </div>

                <div className="md:col-span-2 bg-white rounded-[32px] p-8 border border-slate-100/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                  <Typography
                    variant="h4"
                    weight="bold"
                    className="text-slate-800 mb-6 flex items-center gap-2"
                  >
                    <Target className="w-6 h-6 text-brand" /> Action Plan
                  </Typography>
                  <ul className="space-y-4">
                    {analysis.recommendations?.map(
                      (rec: string, idx: number) => (
                        <li
                          key={idx}
                          className="flex items-start gap-3 bg-brand/5 p-4 rounded-2xl"
                        >
                          <Zap className="w-5 h-5 text-brand shrink-0 mt-0.5" />
                          <span className="text-slate-700 text-sm leading-relaxed">
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

          <div className="bg-white rounded-[32px] p-8 border border-slate-100/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <Typography
              variant="h4"
              weight="bold"
              className="text-slate-800 mb-6"
            >
              Skill Breakdown
            </Typography>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <Typography
                  variant="h6"
                  weight="bold"
                  className="text-slate-700 mb-4 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" /> You Have
                </Typography>
                <div className="flex flex-wrap gap-2">
                  {analysis.current_skills?.map((s: string, i: number) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full text-sm font-medium"
                    >
                      {s}
                    </span>
                  ))}
                  {(!analysis.current_skills ||
                    analysis.current_skills.length === 0) && (
                    <span className="text-slate-400 text-sm italic">
                      No matching skills found in resume.
                    </span>
                  )}
                </div>
              </div>

              <div>
                <Typography
                  variant="h6"
                  weight="bold"
                  className="text-slate-700 mb-4 flex items-center gap-2"
                >
                  <XCircle className="w-5 h-5 text-red-500" /> You&apos;re
                  Missing
                </Typography>
                <div className="space-y-3">
                  {analysis.missing_skills?.map((ms, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 text-sm">
                          {ms.skill}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <span
                            className={cx(
                              "px-2 py-0.5 rounded flex items-center gap-1 font-bold",
                              ms.priority === "High"
                                ? "bg-red-100 text-red-700"
                                : ms.priority === "Medium"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-200 text-slate-700",
                            )}
                          >
                            <AlertCircle className="w-3 h-3" /> {ms.priority}{" "}
                            Priority
                          </span>
                          {ms.estimated_learning_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />{" "}
                              {ms.estimated_learning_time}
                            </span>
                          )}
                        </div>
                        {ms.why && (
                          <p className="text-xs text-slate-500 mt-2">{ms.why}</p>
                        )}
                        {ms.resource && (
                          <p className="text-xs text-brand mt-1">
                            Learn: {ms.resource}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {(!analysis.missing_skills ||
                    analysis.missing_skills.length === 0) && (
                    <span className="text-slate-400 text-sm italic">
                      You have all the required skills!
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
