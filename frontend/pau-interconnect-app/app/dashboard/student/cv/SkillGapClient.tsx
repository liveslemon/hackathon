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

export default function SkillGapClient() {
  const [internships, setInternships] = useState<
    Array<{ id: string; role: string; company: string }>
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [analysis, setAnalysis] = useState<{
    match_percentage?: number;
    recommendations?: string[];
    current_skills?: string[];
    missing_skills?: Array<{
      skill: string;
      priority?: "High" | "Medium" | "Low" | string;
      estimated_learning_time?: string;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Debounced search: query Supabase with text filter
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
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
          .select("id, role, company")
          .or(`role.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%`)
          .order("created_at", { ascending: false })
          .limit(10);

        const jobs = (data || []).filter(
          (j): j is { id: string; role: string; company: string } =>
            Boolean(j.id && j.role && j.company),
        );
        setInternships(jobs);
        setShowDropdown(jobs.length > 0);
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
      const { authenticatedFetch } = await import("@/lib/api");
      const data = await authenticatedFetch<{
        match_percentage?: number;
        recommendations?: string[];
        current_skills?: string[];
        missing_skills?: Array<{
          skill: string;
          priority?: "High" | "Medium" | "Low" | string;
          estimated_learning_time?: string;
        }>;
      }>(`/api/analysis/skill-gap?internship_id=${selectedId}`);
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
                if (internships.length > 0) setShowDropdown(true);
              }}
            />
            {searching && (
              <div className="absolute right-4 top-[42px]">
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              </div>
            )}
            {showDropdown && (
              <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {internships.map((job) => (
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
                ))}
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
        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}
      </div>

      {analysis && (
        <div className="space-y-6 animate-in fade-in duration-700">
          {(() => {
            const matchPercentage = analysis.match_percentage ?? 0;
            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-[32px] p-8 border border-slate-100/60 shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center">
                  <div
                    className="w-32 h-32 rounded-full border-8 flex items-center justify-center mb-4"
                    style={{
                      borderColor:
                        matchPercentage > 70
                          ? "#10b981"
                          : matchPercentage > 40
                            ? "#f59e0b"
                            : "#ef4444",
                    }}
                  >
                    <Typography variant="h1" className="text-slate-800">
                      {matchPercentage}%
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
                    Based on requirements
                  </Typography>
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
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />{" "}
                            {ms.estimated_learning_time}
                          </span>
                        </div>
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
