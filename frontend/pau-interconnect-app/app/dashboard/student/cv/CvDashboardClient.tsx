"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Typography, Stack, Button, Modal } from "@/components/ui";
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
  Sparkles,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

type CvStatus =
  | "loading"
  | "idle"
  | "uploading"
  | "processing"
  | "analyzing"
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
  cv_processing_error?: string | null;
  updated_at?: string | null;
} | null;

// Background analysis normally takes 2-5 minutes. A job still "processing"
// after this long was most likely lost (e.g. server restart).
const STALE_ANALYSIS_MS = 20 * 60 * 1000;
const POLL_MS = 15 * 1000;

function initialStatus(data: InitialCvData, hasCv: boolean): CvStatus {
  if (data?.cv_processing_status === "processing") {
    const startedAt = data.updated_at ? Date.parse(data.updated_at) : NaN;
    if (!Number.isNaN(startedAt) && Date.now() - startedAt < STALE_ANALYSIS_MS) {
      return "analyzing";
    }
    return "failed";
  }
  if (data?.cv_processing_status === "failed") return "failed";
  return hasCv ? "complete" : "idle";
}

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
  userId,
  initialData,
  initialMetrics,
}: {
  userId: string;
  initialData: InitialCvData;
  initialMetrics?: MetricsData;
}) {
  const router = useRouter();
  const initial = parseInitialData(initialData);
  const [status, setStatus] = useState<CvStatus>(() =>
    initialStatus(initialData, initial.hasCv),
  );
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Derived from props (not state) so router.refresh() shows fresh results.
  const cvData: CvData = {
    has_cv: initial.hasCv,
    ats_score: initialMetrics?.ats_score ?? 0,
    career_score: initialMetrics?.career_score ?? 0,
    avg_match_rate: initialMetrics?.avg_match_rate ?? 0,
    applications_sent: initialMetrics?.applications_sent ?? 0,
    cv_structured: initial.structured,
  };
  const metricsLoaded = true;
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState(() =>
    initialData?.cv_processing_status === "failed"
      ? initialData.cv_processing_error ||
        "CV analysis failed. Please upload your CV again."
      : initialData?.cv_processing_status === "processing"
        ? "Your last CV analysis didn't finish. Please upload your CV again."
        : "",
  );

  // While the backend analyses the CV, poll its status and refresh the
  // server-rendered results when it finishes.
  useEffect(() => {
    if (status !== "analyzing" || !userId) return;
    let cancelled = false;
    const check = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("cv_processing_status, cv_processing_error")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled || !data) return;
      if (data.cv_processing_status === "complete") {
        setStatus("complete");
        setShowCompletionModal(true);
        router.refresh();
      } else if (data.cv_processing_status === "failed") {
        setStatus("failed");
        setErrorMessage(
          data.cv_processing_error ||
            "CV analysis failed. Please upload your CV again.",
        );
      }
    };
    void check();
    const timer = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [status, userId, router]);

  const handleDropFiles = (files: FileList) => {
    const file = Array.from(files)[0];
    if (!file) return;

    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setErrorMessage("Please upload a PDF document.");
      return;
    }
    if (file.size < 100) {
      setErrorMessage("File is too small or empty. Please upload a valid CV (min 100 bytes).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("File size exceeds 5MB limit. Please upload a smaller file.");
      return;
    }

    const id = Math.random().toString();
    setUploadedFiles([
      {
        id,
        name: file.name,
        type: file.type || "application/pdf",
        size: file.size,
        progress: 0,
      },
    ]);
    setSelectedFile(file);
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

      setUploadedFiles([]);
      setSelectedFile(null);
      setStatus("analyzing");
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
          className="w-10 h-10 rounded-xl border border-border bg-surface flex items-center justify-center hover:bg-surface-sunken transition-colors text-fg-muted hover:text-fg"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <Typography variant="h4" weight="bold" className="text-fg leading-tight">
            CV & Career Analysis
          </Typography>
          <Typography variant="caption" className="text-fg-muted font-normal mt-0.5">
            Upload, analyze, and optimize your CV for real-time placement compatibility
          </Typography>
        </div>
      </div>

      {/* Stats row - always show if CV exists */}
      {hasCv && cvData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface rounded-2xl p-5 border border-border shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-subtle text-brand flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <Typography
                variant="caption"
                className="text-fg-muted font-medium mb-0.5 block truncate"
              >
                Career Score
              </Typography>
              {metricsLoaded ? (
                <Typography
                  variant="h4"
                  weight="bold"
                  className="text-fg leading-tight"
                >
                  {cvData.career_score}
                </Typography>
              ) : (
                <div className="h-7 w-10 bg-surface-sunken rounded-lg animate-pulse" />
              )}
            </div>
          </div>

          <div className="bg-surface rounded-2xl p-5 border border-border shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success-subtle text-success-fg flex items-center justify-center shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <Typography
                variant="caption"
                className="text-fg-muted font-medium mb-0.5 block truncate"
              >
                ATS Readiness
              </Typography>
              {metricsLoaded ? (
                <Typography
                  variant="h4"
                  weight="bold"
                  className="text-fg leading-tight"
                >
                  {cvData.ats_score}%
                </Typography>
              ) : (
                <div className="h-7 w-12 bg-surface-sunken rounded-lg animate-pulse" />
              )}
            </div>
          </div>

          <div className="bg-surface rounded-2xl p-5 border border-border shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-info-subtle text-info-fg flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <Typography
                variant="caption"
                className="text-fg-muted font-medium mb-0.5 block truncate"
              >
                Avg Match Rate
              </Typography>
              {metricsLoaded ? (
                <Typography
                  variant="h4"
                  weight="bold"
                  className="text-fg leading-tight"
                >
                  {cvData.avg_match_rate}%
                </Typography>
              ) : (
                <div className="h-7 w-12 bg-surface-sunken rounded-lg animate-pulse" />
              )}
            </div>
          </div>

          <div className="bg-surface rounded-2xl p-5 border border-border shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-subtle text-brand flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <Typography
                variant="caption"
                className="text-fg-muted font-medium mb-0.5 block truncate"
              >
                Applications Sent
              </Typography>
              {metricsLoaded ? (
                <Typography
                  variant="h4"
                  weight="bold"
                  className="text-fg leading-tight"
                >
                  {cvData.applications_sent}
                </Typography>
              ) : (
                <div className="h-7 w-8 bg-surface-sunken rounded-lg animate-pulse" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload section */}
      <div className="rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-xs">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <Typography variant="h5" weight="bold" className="text-fg leading-tight">
              {hasCv ? "Update your CV" : "Upload your CV"}
            </Typography>
            <Typography variant="caption" className="text-fg-muted mt-0.5 block">
              {hasCv
                ? "Upload a new PDF to update parsing, skill extracts, and vector embeddings."
                : "Upload your CV to calculate your compatibility scores across all open internships."}
            </Typography>
          </div>
        </div>

        {status === "analyzing" ? (
          <div
            role="status"
            className="flex items-start gap-3.5 rounded-2xl bg-brand-subtle/50 border border-brand/20 p-5"
          >
            <Loader2 className="w-5 h-5 text-brand shrink-0 mt-0.5 animate-spin" />
            <div className="flex-1">
              <Typography variant="body2" weight="bold" className="text-brand">
                Analyzing your CV. This runs in the background.
              </Typography>
              <Typography variant="caption" className="text-fg-muted mt-1 block">
                You can safely browse the platform or apply to internships while this completes. We will update your profile automatically.
              </Typography>
            </div>
          </div>
        ) : status === "complete" && uploadedFiles.length === 0 && hasCv ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-success-subtle border border-success/20 p-5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success-fg shrink-0" />
              <div>
                <Typography variant="body2" weight="semibold" className="text-success-fg">
                  Your CV has been analyzed.
                </Typography>
                <Typography variant="caption" className="text-fg-muted">
                  Match scores across open postings are up to date.
                </Typography>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset} className="shrink-0">
              Upload New CV
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
                  <div className="flex gap-3 pt-2">
                    <Button
                      colorType="primary"
                      onClick={handleAnalyze}
                      disabled={!selectedFile}
                      className="gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Start Analysis</span>
                    </Button>
                    <Button variant="outline" onClick={handleReset}>
                      Cancel
                    </Button>
                  </div>
                )}

                {(status === "uploading" || status === "processing") && (
                  <div className="flex items-center gap-2.5 text-fg-muted py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-brand" />
                    <Typography variant="body2">
                      {status === "uploading"
                        ? "Uploading file to secure storage…"
                        : "Parsing document structure…"}
                    </Typography>
                  </div>
                )}
              </>
            )}

            {status === "failed" && (
              <div className="flex items-start gap-3.5 rounded-2xl bg-danger-subtle border border-danger/20 p-5">
                <AlertCircle className="w-5 h-5 text-danger-fg shrink-0 mt-0.5" />
                <div className="flex-1">
                  <Typography variant="body2" weight="semibold" className="text-danger-fg">
                    Upload issue
                  </Typography>
                  <Typography variant="caption" className="text-danger-fg/80 mt-0.5 block">
                    {errorMessage}
                  </Typography>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset} className="shrink-0">
                  Try Again
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
              <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                <Typography
                  variant="h6"
                  weight="bold"
                  className="text-fg mb-4"
                >
                  Extracted Skills ({uniqueSkills.length})
                </Typography>
                <div className="flex flex-wrap gap-2">
                  {uniqueSkills.map((skill, idx) => (
                    <span
                      key={`${skill}-${idx}`}
                      className="px-3 py-1 rounded-full bg-brand-subtle text-brand text-xs font-semibold border border-brand/20"
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
              <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                <Typography
                  variant="h6"
                  weight="bold"
                  className="text-fg mb-4"
                >
                  Experience
                </Typography>
                <Stack spacing={4}>
                  {experience.map((exp, i) => (
                    <div key={i} className="border-l-2 border-brand pl-4">
                      <Typography
                        variant="body2"
                        weight="bold"
                        className="text-fg"
                      >
                        {exp.title || "Untitled Role"}
                      </Typography>
                      {(exp.organization || exp.company) && (
                        <Typography
                          variant="caption"
                          className="text-fg-muted font-medium"
                        >
                          {exp.organization || exp.company}
                        </Typography>
                      )}
                      {exp.duration && (
                        <Typography
                          variant="caption"
                          className="text-fg-subtle block mt-0.5"
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
            const eduList = Array.isArray(education) ? education : [education];
            if (eduList.length === 0) return null;
            return (
              <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                <Typography
                  variant="h6"
                  weight="bold"
                  className="text-fg mb-4"
                >
                  Education
                </Typography>
                <Stack spacing={4}>
                  {eduList.map((edu, i) => (
                    <div key={i} className="border-l-2 border-success pl-4">
                      <Typography
                        variant="body2"
                        weight="bold"
                        className="text-fg"
                      >
                        {edu.degree || "Degree"}
                      </Typography>
                      {edu.institution && (
                        <Typography
                          variant="caption"
                          className="text-fg-muted font-medium"
                        >
                          {edu.institution}
                        </Typography>
                      )}
                      {(edu as { level?: string }).level && (
                        <Typography
                          variant="caption"
                          className="text-fg-subtle block mt-0.5"
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
              <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
                <Typography
                  variant="h6"
                  weight="bold"
                  className="text-fg mb-4"
                >
                  Highlighted Projects
                </Typography>
                <Stack spacing={4}>
                  {projects.map((proj, i) => (
                    <div key={i} className="border-l-2 border-brand pl-4">
                      <Typography
                        variant="body2"
                        weight="bold"
                        className="text-fg"
                      >
                        {proj.name || "Project"}
                      </Typography>
                      {proj.description && (
                        <Typography
                          variant="caption"
                          className="text-fg-muted line-clamp-2 mt-0.5"
                        >
                          {proj.description}
                        </Typography>
                      )}
                      {proj.technologies && proj.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {proj.technologies.map((t, idx) => (
                            <span
                              key={`${t}-${idx}`}
                              className="px-2 py-0.5 rounded-md bg-surface-sunken text-fg-muted text-[11px] font-medium border border-border"
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
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs">
            <Typography
              variant="h6"
              weight="bold"
              className="text-fg mb-2"
            >
              Executive Summary
            </Typography>
            <Typography
              variant="body2"
              className="text-fg-muted leading-relaxed"
            >
              {String(structured.summary)}
            </Typography>
          </div>
        )}

      {/* Completion Modal Popup */}
      <Modal
        isOpen={showCompletionModal}
        onClose={() => setShowCompletionModal(false)}
        title="CV Analysis Complete!"
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="outline"
              onClick={() => setShowCompletionModal(false)}
            >
              View Analysis
            </Button>
            <Button
              colorType="primary"
              onClick={() => {
                setShowCompletionModal(false);
                router.push("/dashboard/student");
              }}
              className="gap-1.5"
            >
              <span>Explore Matched Roles</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-2">
          <div className="w-12 h-12 rounded-2xl bg-success-subtle text-success-fg flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="text-center">
            <Typography variant="h5" weight="bold" className="text-fg">
              Your profile is now calibrated!
            </Typography>
            <Typography variant="body2" className="text-fg-muted mt-1">
              We parsed your technical background and computed compatibility
              scores across every open internship.
            </Typography>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="p-3 bg-surface-sunken rounded-xl text-center border border-border">
              <span className="text-xs text-fg-subtle block">Career Score</span>
              <span className="text-xl font-bold text-fg">
                {cvData.career_score}
              </span>
            </div>
            <div className="p-3 bg-surface-sunken rounded-xl text-center border border-border">
              <span className="text-xs text-fg-subtle block">ATS Readiness</span>
              <span className="text-xl font-bold text-fg">
                {cvData.ats_score}%
              </span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
