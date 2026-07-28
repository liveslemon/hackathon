"use client";
import { useState } from "react";
import { Typography, Stack } from "@/components/ui";
import { Button } from "@/components/ui";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Target,
  Trophy,
  TrendingUp,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

type CvStatus =
  | "loading"
  | "idle"
  | "uploading"
  | "processing"
  | "complete"
  | "failed";

type UploadedFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  progress: number;
};

type CvData = {
  has_cv: boolean;
  ats_score: number;
  career_score: number;
  avg_match_rate: number;
  applications_sent: number;
  cv_structured: Record<string, unknown> | null;
};

function simulateUploadProgress(onProgress: (progress: number) => void) {
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 8) + 5;
    if (progress > 100) progress = 100;
    onProgress(progress);
    if (progress >= 100) clearInterval(interval);
  }, 25);
}

type InitialCvData = {
  cv_text?: string | null;
  cv_url?: string | null;
  cv_structured?: unknown;
  cv_processing_status?: string | null;
} | null;

function parseInitialData(data: InitialCvData): {
  hasCv: boolean;
  structured: CvData["cv_structured"];
} {
  if (!data) return { hasCv: false, structured: null };

  const hasCv = Boolean(
    data.cv_text ||
    data.cv_structured ||
    data.cv_url ||
    data.cv_processing_status === "complete",
  );

  let raw = data.cv_structured;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }

  return { hasCv, structured: (raw as CvData["cv_structured"]) ?? null };
}

type MetricsData = {
  career_score: number;
  ats_score: number;
  avg_match_rate: number;
  applications_sent: number;
};

export default function CvDashboardClient({
  initialData,
  initialMetrics,
}: {
  userId: string;
  initialData: InitialCvData;
  initialMetrics?: MetricsData;
}) {
  const initial = parseInitialData(initialData);
  const [status, setStatus] = useState<CvStatus>(
    initial.hasCv ? "complete" : "idle",
  );
  const [cvData] = useState<CvData>({
    has_cv: initial.hasCv,
    ats_score: initialMetrics?.ats_score ?? 0,
    career_score: initialMetrics?.career_score ?? 0,
    avg_match_rate: initialMetrics?.avg_match_rate ?? 0,
    applications_sent: initialMetrics?.applications_sent ?? 0,
    cv_structured: initial.structured,
  });
  const [metricsLoaded] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleDropFiles = (files: FileList) => {
    const pdf = Array.from(files).find(
      (f) => f.type === "application/pdf" && f.size <= 5 * 1024 * 1024,
    );
    if (!pdf) {
      setErrorMessage("Please upload a PDF file under 5MB.");
      return;
    }
    const id = Math.random().toString();
    setUploadedFiles([
      { id, name: pdf.name, type: pdf.type, size: pdf.size, progress: 0 },
    ]);
    setSelectedFile(pdf);
    setStatus("idle");
    setErrorMessage("");
    simulateUploadProgress((progress) => {
      setUploadedFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, progress } : f)),
      );
    });
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setStatus("uploading");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      setStatus("processing");
      const res = await fetch("/api/cv/upload", {
        method: "POST",
        body: formData,
      });

      const payload: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message =
          (payload as { message?: string })?.message ??
          "CV analysis failed. Please try again.";
        setStatus("failed");
        setErrorMessage(message);
        return;
      }

      // Reload the page to get fresh server-rendered data
      window.location.reload();
    } catch {
      setStatus("failed");
      setErrorMessage("Network error. Please check your connection and retry.");
    }
  };

  const handleReset = () => {
    setUploadedFiles([]);
    setSelectedFile(null);
    setStatus("idle");
    setErrorMessage("");
  };

  const hasCv = cvData.has_cv;
  const structured = cvData.cv_structured as Record<string, unknown> | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/student"
          className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
        </Link>
        <div>
          <Typography variant="h4" weight="bold" className="text-slate-800">
            CV & Career Analysis
          </Typography>
          <Typography variant="caption" className="text-slate-400">
            Upload, analyze, and improve your CV for better internship matches
          </Typography>
        </div>
      </div>

      {/* Stats row - always show if CV exists */}
      {hasCv && cvData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              {metricsLoaded ? (
                <Typography
                  variant="h4"
                  weight="bold"
                  className="text-slate-800"
                >
                  {cvData.career_score}
                </Typography>
              ) : (
                <div className="h-7 w-10 bg-slate-100 rounded-lg animate-pulse" />
              )}
            </div>
          </div>

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
              {metricsLoaded ? (
                <Typography
                  variant="h4"
                  weight="bold"
                  className="text-slate-800"
                >
                  {cvData.ats_score}%
                </Typography>
              ) : (
                <div className="h-7 w-12 bg-slate-100 rounded-lg animate-pulse" />
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <Typography
                variant="body2"
                className="text-slate-400 font-semibold mb-0.5"
              >
                Avg Match Rate
              </Typography>
              {metricsLoaded ? (
                <Typography
                  variant="h4"
                  weight="bold"
                  className="text-slate-800"
                >
                  {cvData.avg_match_rate}%
                </Typography>
              ) : (
                <div className="h-7 w-12 bg-slate-100 rounded-lg animate-pulse" />
              )}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6 text-violet-500" />
            </div>
            <div>
              <Typography
                variant="body2"
                className="text-slate-400 font-semibold mb-0.5"
              >
                Applications
              </Typography>
              {metricsLoaded ? (
                <Typography
                  variant="h4"
                  weight="bold"
                  className="text-slate-800"
                >
                  {cvData.applications_sent}
                </Typography>
              ) : (
                <div className="h-7 w-8 bg-slate-100 rounded-lg animate-pulse" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload section */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <Typography variant="h6" weight="bold" className="text-slate-800">
              {hasCv ? "Update your CV" : "Upload your CV"}
            </Typography>
            <Typography variant="caption" className="text-slate-400">
              {hasCv
                ? "Replace your current CV to refresh your analysis and match scores"
                : "Upload your CV to get personalized internship matching and career insights"}
            </Typography>
          </div>
        </div>

        {status === "complete" && uploadedFiles.length === 0 && hasCv ? (
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="flex-1">
              <Typography variant="body2" className="text-emerald-700">
                Your CV has been analyzed. Scores and matches are up to date.
              </Typography>
            </div>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Upload new CV
            </Button>
          </div>
        ) : (
          <Stack spacing={4}>
            {uploadedFiles.length === 0 ? (
              <FileUpload.Root>
                <FileUpload.DropZone
                  onDropFiles={handleDropFiles}
                  accept="application/pdf"
                  maxSize={5 * 1024 * 1024}
                  hint="PDF only, up to 5MB"
                />
              </FileUpload.Root>
            ) : (
              <>
                <FileUpload.Root>
                  <FileUpload.List>
                    {uploadedFiles.map((f) => (
                      <FileUpload.ListItemProgressBar
                        key={f.id}
                        {...f}
                        size={f.size}
                        onDelete={handleReset}
                      />
                    ))}
                  </FileUpload.List>
                </FileUpload.Root>

                {status === "idle" && (
                  <Button
                    onClick={handleAnalyze}
                    className="w-fit"
                    disabled={!selectedFile}
                  >
                    Analyze CV
                  </Button>
                )}

                {(status === "uploading" || status === "processing") && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <Typography variant="body2">
                      {status === "uploading"
                        ? "Uploading..."
                        : "Analyzing your CV... This may take a moment."}
                    </Typography>
                  </div>
                )}
              </>
            )}

            {status === "failed" && (
              <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-100 p-4">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <Typography variant="body2" className="text-red-700">
                    {errorMessage}
                  </Typography>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Try again
                </Button>
              </div>
            )}
          </Stack>
        )}
      </div>

      {/* Parsed CV sections - only show if structured data exists */}
      {hasCv && structured && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Skills */}
          {(() => {
            const skills = structured.skills as
              | { technical?: string[]; soft?: string[]; tools?: string[] }
              | string[]
              | undefined;
            const allSkills: string[] = Array.isArray(skills)
              ? skills
              : [
                  ...((skills as { technical?: string[] })?.technical ?? []),
                  ...((skills as { soft?: string[] })?.soft ?? []),
                  ...((skills as { tools?: string[] })?.tools ?? []),
                ];
            if (allSkills.length === 0) return null;
            const uniqueSkills = [...new Set(allSkills)];
            return (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <Typography
                  variant="h6"
                  weight="bold"
                  className="text-slate-800 mb-4"
                >
                  Extracted Skills
                </Typography>
                <div className="flex flex-wrap gap-2">
                  {uniqueSkills.map((skill, idx) => (
                    <span
                      key={`${skill}-${idx}`}
                      className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Experience */}
          {(() => {
            const experience = structured.experience as
              | Array<{
                  title?: string;
                  organization?: string;
                  company?: string;
                  duration?: string;
                  highlights?: string[];
                }>
              | undefined;
            if (!experience || experience.length === 0) return null;
            return (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <Typography
                  variant="h6"
                  weight="bold"
                  className="text-slate-800 mb-4"
                >
                  Experience
                </Typography>
                <Stack spacing={3}>
                  {experience.map((exp, i) => (
                    <div key={i} className="border-l-2 border-indigo-200 pl-4">
                      <Typography
                        variant="body2"
                        weight="bold"
                        className="text-slate-700"
                      >
                        {exp.title || "Untitled Role"}
                      </Typography>
                      {(exp.organization || exp.company) && (
                        <Typography
                          variant="caption"
                          className="text-slate-500"
                        >
                          {exp.organization || exp.company}
                        </Typography>
                      )}
                      {exp.duration && (
                        <Typography
                          variant="caption"
                          className="text-slate-400 block"
                        >
                          {exp.duration}
                        </Typography>
                      )}
                    </div>
                  ))}
                </Stack>
              </div>
            );
          })()}

          {/* Education */}
          {(() => {
            const education = structured.education as
              | {
                  degree?: string;
                  institution?: string;
                  level?: string;
                  relevant_coursework?: string[];
                }
              | Array<{ degree?: string; institution?: string; year?: string }>
              | undefined;
            if (!education) return null;
            // Handle both single object and array format
            const eduList = Array.isArray(education) ? education : [education];
            if (eduList.length === 0) return null;
            return (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <Typography
                  variant="h6"
                  weight="bold"
                  className="text-slate-800 mb-4"
                >
                  Education
                </Typography>
                <Stack spacing={3}>
                  {eduList.map((edu, i) => (
                    <div key={i} className="border-l-2 border-emerald-200 pl-4">
                      <Typography
                        variant="body2"
                        weight="bold"
                        className="text-slate-700"
                      >
                        {edu.degree || "Degree"}
                      </Typography>
                      {edu.institution && (
                        <Typography
                          variant="caption"
                          className="text-slate-500"
                        >
                          {edu.institution}
                        </Typography>
                      )}
                      {(edu as { level?: string }).level && (
                        <Typography
                          variant="caption"
                          className="text-slate-400 block"
                        >
                          {(edu as { level?: string }).level}
                        </Typography>
                      )}
                    </div>
                  ))}
                </Stack>
              </div>
            );
          })()}

          {/* Projects */}
          {(() => {
            const projects = structured.projects as
              | Array<{
                  name?: string;
                  description?: string;
                  technologies?: string[];
                }>
              | undefined;
            if (!projects || projects.length === 0) return null;
            return (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <Typography
                  variant="h6"
                  weight="bold"
                  className="text-slate-800 mb-4"
                >
                  Projects
                </Typography>
                <Stack spacing={3}>
                  {projects.map((proj, i) => (
                    <div key={i} className="border-l-2 border-violet-200 pl-4">
                      <Typography
                        variant="body2"
                        weight="bold"
                        className="text-slate-700"
                      >
                        {proj.name || "Project"}
                      </Typography>
                      {proj.description && (
                        <Typography
                          variant="caption"
                          className="text-slate-500"
                        >
                          {proj.description}
                        </Typography>
                      )}
                      {proj.technologies && proj.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {proj.technologies.map((t, idx) => (
                            <span
                              key={`${t}-${idx}`}
                              className="px-2 py-0.5 rounded bg-violet-50 text-violet-600 text-xs"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </Stack>
              </div>
            );
          })()}
        </div>
      )}

      {/* Summary */}
      {hasCv &&
        typeof structured?.summary === "string" &&
        structured.summary && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <Typography
              variant="h6"
              weight="bold"
              className="text-slate-800 mb-3"
            >
              AI Summary
            </Typography>
            <Typography
              variant="body2"
              className="text-slate-600 leading-relaxed"
            >
              {String(structured.summary)}
            </Typography>
          </div>
        )}
    </div>
  );
}
