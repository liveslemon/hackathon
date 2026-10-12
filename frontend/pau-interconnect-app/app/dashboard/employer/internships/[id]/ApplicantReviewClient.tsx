"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { cx } from "@/utils/cx";
import {
  Typography,
  Stack,
  Button,
  StatusPill,
  EmptyState,
  Drawer,
  Modal,
} from "@/components/ui";
import {
  FileText,
  CheckCircle,
  XCircle,
  User,
  MessageSquare,
  Download,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { authenticatedFetch, ensureFreshCvUrl } from "@/lib/api";
import { PipelineView } from "./PipelineView";
import { downloadCSV } from "@/lib/csv";
import { MatchScore } from "@/components/match/MatchScore";
import { DecisionTimeline } from "@/components/DecisionTimeline";
import { MessageThread } from "@/components/MessageThread";

export type ApplicantProfile = {
  id?: string;
  full_name?: string;
  email?: string;
  course?: string;
  level?: string;
  cv_url?: string;
};

export type Applicant = {
  id: string;
  status?: string;
  stage?: string;
  match_score?: number;
  created_at?: string;
  cover_letter?: string;
  profiles?: ApplicantProfile;
};

interface ApplicantReviewClientProps {
  internship: { role?: string } | null;
  applicants: Applicant[];
  userProfile: unknown;
}

export default function ApplicantReviewClient({
  internship,
  applicants: initialApplicants,
  userProfile,
}: ApplicantReviewClientProps) {
  const [applicants, setApplicants] = useState<Applicant[]>(initialApplicants);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "pipeline">("list");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");
  const [sortBy, setSortBy] = useState<"newest" | "match" | "name">("newest");
  const [activeMessageApp, setActiveMessageApp] = useState<Applicant | null>(null);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [isStartingConvo, setIsStartingConvo] = useState(false);
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);

  // --- Search Sync ---
  React.useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
      const query = (e as CustomEvent).detail;
      setSearchQuery(query || "");
    };
    window.addEventListener("dashboardSearch", handleGlobalSearch);
    return () =>
      window.removeEventListener("dashboardSearch", handleGlobalSearch);
  }, []);

  const handleOpenMessage = async (app: Applicant) => {
    setActiveMessageApp(app);
    setIsStartingConvo(true);
    try {
      const res = await authenticatedFetch<{ conversation_id?: string }>("/api/messages/start", {
        method: "POST",
        body: JSON.stringify({
          application_id: app.id,
          message: `Hello ${app.profiles?.full_name || "Applicant"}, thank you for applying to the ${internship?.role || "internship"} role.`,
        }),
      });
      if (res?.conversation_id) {
        setActiveConvoId(res.conversation_id);
      } else {
        toast.error("Could not start conversation");
      }
    } catch {
      toast.error("Failed to connect to messages");
    } finally {
      setIsStartingConvo(false);
    }
  };

  const handleStatusChange = async (
    applicationId: string,
    newStatus: string,
  ) => {
    // Map list-view status values to pipeline stage values
    const stageValue = newStatus === "pending" ? "applied" : newStatus;
    const statusValue =
      stageValue === "accepted"
        ? "accepted"
        : stageValue === "rejected"
          ? "rejected"
          : "pending";

    setIsUpdatingStage(true);
    try {
      const result = await authenticatedFetch<{
        email?: { status: string; reason?: string; error?: string };
      }>(`/api/applications/${applicationId}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ stage: stageValue }),
      });

      const email = result?.email;
      if (email?.status === "sent") {
        toast.success("Stage updated. The student was emailed.");
      } else if (email && email.reason !== "not attempted") {
        toast.warning(
          `Stage updated and the student was notified in-app, but no email was sent: ${
            email.reason ?? email.error ?? "unknown reason"
          }`,
        );
      } else {
        toast.success("Stage updated successfully.");
      }

      setApplicants((prev) =>
        prev.map((app) =>
          app.id === applicationId
            ? { ...app, stage: stageValue, status: statusValue }
            : app,
        ),
      );

      // Keep selected applicant synchronized if open in drawer
      setSelectedApplicant((prev) =>
        prev && prev.id === applicationId
          ? { ...prev, stage: stageValue, status: statusValue }
          : prev,
      );
    } catch (err: unknown) {
      toast.error(
        "Failed to update candidate state: " +
          (err instanceof Error ? err.message : "Unknown error"),
      );
    } finally {
      setIsUpdatingStage(false);
    }
  };

  const handleViewCv = async (app: Applicant) => {
    const studentInfo = app.profiles;
    if (!studentInfo?.cv_url) {
      toast.error("Candidate has not uploaded a CV");
      return;
    }

    const popup = window.open("about:blank", "_blank");
    if (!popup) {
      toast.error("Popup blocked. Please allow popups for this site.");
      return;
    }

    try {
      const studentId = studentInfo.id;
      if (!studentId) {
        popup.close();
        toast.error("Candidate profile is missing an ID");
        return;
      }
      const freshUrl = await ensureFreshCvUrl(studentId, studentInfo.cv_url);
      const rawFullName = studentInfo?.full_name || "Student";
      const safeName = rawFullName.trim().replace(/\s+/g, "_") + "_CV";
      const viewerUrl = `/cv/view?name=${encodeURIComponent(safeName)}&url=${encodeURIComponent(freshUrl)}`;
      popup.location.href = viewerUrl;
    } catch (err) {
      console.error("CV view error:", err);
      popup.close();
      toast.error("Failed to load secure CV link");
    }
  };

  const filteredApplicants = applicants
    .filter((app) => {
      const p = app.profiles || {};
      const textToSearch =
        `${p?.full_name || ""} ${p?.course || ""} ${p?.level || ""}`.toLowerCase();
      const matchesSearch = textToSearch.includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || (app.status || "pending") === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "match":
          return (b.match_score || 0) - (a.match_score || 0);
        case "name":
          return (a.profiles?.full_name || "").localeCompare(
            b.profiles?.full_name || "",
          );
        case "newest":
        default:
          return (
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
          );
      }
    });

  return (
    <div className="space-y-8">
      {/* 1. Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Typography
            variant="h2"
            weight="bold"
            className="text-fg tracking-tight mb-1"
          >
            {internship?.role || "Internship"} Applicants
          </Typography>
          <Typography variant="body2" color="muted">
            Reviewing{" "}
            <span className="text-brand font-semibold">
              {filteredApplicants.length}
            </span>{" "}
            {filteredApplicants.length === 1 ? "candidate" : "candidates"} for this position.
          </Typography>
        </div>
      </header>

      {/* 2. Controls Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle */}
          <div className="flex gap-1 p-1 bg-surface-sunken rounded-xl border border-border/60">
            <button
              onClick={() => setViewMode("list")}
              className={cx(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === "list"
                  ? "bg-surface text-fg shadow-sm"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode("pipeline")}
              className={cx(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                viewMode === "pipeline"
                  ? "bg-surface text-fg shadow-sm"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              Pipeline View
            </button>
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1.5 pl-2">
            {(["all", "pending", "accepted", "rejected"] as const).map((status) => {
              const count =
                status === "all"
                  ? applicants.length
                  : applicants.filter((a) => (a.status || "pending") === status).length;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cx(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                    statusFilter === status
                      ? "bg-brand text-fg-inverse shadow-sm"
                      : "bg-surface-sunken text-fg-muted hover:bg-surface border border-border/40",
                  )}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Sort & Export controls */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2">
            <Typography variant="caption" color="muted" className="font-semibold text-fg-muted">
              Sort:
            </Typography>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-xs font-medium border border-border bg-surface rounded-lg px-2.5 py-1.5 text-fg focus:outline-none focus:ring-2 focus:ring-focus-ring"
            >
              <option value="newest">Newest First</option>
              <option value="match">Highest Match Score</option>
              <option value="name">Candidate Name</option>
            </select>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const headers = [
                "Name",
                "Email",
                "Course",
                "Level",
                "Match Score",
                "Status",
                "Stage",
                "Applied Date",
                "Cover Letter",
              ];
              const rows = filteredApplicants.map((app) => [
                app.profiles?.full_name || "",
                app.profiles?.email || "",
                app.profiles?.course || "",
                app.profiles?.level || "",
                String(app.match_score || 0),
                app.status || "pending",
                app.stage || "applied",
                app.created_at || "",
                (app.cover_letter || "").replace(/\n/g, " "),
              ]);
              downloadCSV(
                headers,
                rows,
                `applicants-${internship?.role?.replace(/\s/g, "-") || "export"}`,
              );
            }}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* 3. Main Content: Empty / Pipeline / List */}
      {applicants.length === 0 ? (
        <EmptyState
          icon={<User className="w-8 h-8 text-brand" />}
          title="No applicants yet"
          description="When students apply, they'll appear here for your professional candidate review."
        />
      ) : filteredApplicants.length === 0 ? (
        <EmptyState
          icon={<User className="w-8 h-8 text-brand" />}
          title="No candidates match your filters"
          description="Try selecting a different status filter or clearing your search query."
          action={{
            label: "Reset Filters",
            onClick: () => {
              setStatusFilter("all");
              setSearchQuery("");
            },
          }}
        />
      ) : viewMode === "pipeline" ? (
        <PipelineView
          applicants={filteredApplicants}
          onStageChange={handleStatusChange}
          onSelectApplicant={(app) => setSelectedApplicant(app)}
        />
      ) : (
        <Stack spacing={3}>
          {filteredApplicants.map((app) => {
            const studentInfo = app.profiles || {};
            const isSelected = selectedApplicant?.id === app.id;

            return (
              <div
                key={app.id}
                tabIndex={0}
                role="button"
                aria-label={`View dossier for ${studentInfo?.full_name || "Student"}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedApplicant(app);
                  }
                }}
                onClick={() => setSelectedApplicant(app)}
                className={cx(
                  "bg-surface rounded-2xl p-4 sm:p-5 transition-all duration-200 border cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4",
                  isSelected
                    ? "border-brand ring-2 ring-brand/20 shadow-md"
                    : "border-border hover:border-border-strong hover:shadow-sm",
                )}
              >
                {/* Left: Avatar & Candidate Identity */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div
                    className={cx(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-base font-bold shrink-0 transition-colors",
                      isSelected
                        ? "bg-brand text-fg-inverse"
                        : "bg-surface-sunken text-fg-muted group-hover:bg-brand-subtle group-hover:text-brand",
                    )}
                  >
                    {studentInfo?.full_name?.charAt(0) || "S"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Typography
                        variant="body1"
                        weight="bold"
                        className="text-fg group-hover:text-brand transition-colors truncate"
                      >
                        {studentInfo?.full_name || "Unknown Student"}
                      </Typography>
                      {app.created_at && (
                        <span className="text-[11px] text-fg-subtle hidden sm:inline">
                          • Applied {new Date(app.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Typography
                      variant="caption"
                      className="text-fg-muted truncate block"
                    >
                      {studentInfo?.course || "Course N/A"} • Lv. {studentInfo?.level || "N/A"}
                    </Typography>
                  </div>
                </div>

                {/* Middle: Live Match Score & Stage Pill */}
                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  <MatchScore score={app.match_score} />
                  <StatusPill status={app.stage || "applied"} />
                </div>

                {/* Right: Quick Action Buttons & Drawer Arrow */}
                <div
                  className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/40 justify-between md:justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => handleOpenMessage(app)}
                    leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                    className="text-xs font-semibold"
                  >
                    Message
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setSelectedApplicant(app)}
                    className="text-xs font-semibold"
                  >
                    Review Dossier
                  </Button>
                  <ChevronRight className="w-4 h-4 text-fg-subtle group-hover:text-brand group-hover:translate-x-0.5 transition-all hidden sm:block" />
                </div>
              </div>
            );
          })}
        </Stack>
      )}

      {/* 4. Applicant Detail Drawer */}
      <Drawer
        isOpen={Boolean(selectedApplicant)}
        onClose={() => setSelectedApplicant(null)}
        title={selectedApplicant?.profiles?.full_name || "Applicant Dossier"}
        className="w-full sm:max-w-lg"
      >
        {selectedApplicant && (
          <div className="p-6 space-y-6">
            {/* Candidate Header Identity */}
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-surface-sunken border border-border">
              <div className="w-14 h-14 rounded-xl bg-brand text-fg-inverse flex items-center justify-center text-xl font-bold shrink-0">
                {selectedApplicant.profiles?.full_name?.charAt(0) || "S"}
              </div>
              <div className="min-w-0 flex-1">
                <Typography variant="h4" weight="bold" className="text-fg truncate">
                  {selectedApplicant.profiles?.full_name || "Unknown Student"}
                </Typography>
                <Typography variant="caption" className="text-fg-muted block mt-0.5">
                  {selectedApplicant.profiles?.course || "Course N/A"} • Level {selectedApplicant.profiles?.level || "N/A"}
                </Typography>
                {selectedApplicant.profiles?.email && (
                  <Typography variant="caption" className="text-fg-subtle truncate block mt-0.5">
                    {selectedApplicant.profiles.email}
                  </Typography>
                )}
              </div>
            </div>

            {/* Compatibility Match Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Typography variant="subtitle2" weight="bold" className="text-fg-muted uppercase tracking-wider text-[11px]">
                  Compatibility Match
                </Typography>
                <StatusPill status={selectedApplicant.stage || "applied"} />
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border">
                <MatchScore
                  score={selectedApplicant.match_score}
                  showExplanation={true}
                  className="w-full"
                />
              </div>
            </div>

            {/* Decision & Stage Control */}
            <div className="space-y-3 p-4 rounded-2xl bg-surface border border-border">
              <Typography variant="subtitle2" weight="bold" className="text-fg uppercase tracking-wider text-[11px]">
                Review Decision
              </Typography>

              <div className="space-y-2">
                <label className="text-xs text-fg-muted block font-medium">
                  Update Stage
                </label>
                <select
                  value={selectedApplicant.stage || "applied"}
                  disabled={isUpdatingStage}
                  onChange={(e) =>
                    handleStatusChange(selectedApplicant.id, e.target.value)
                  }
                  className="w-full h-11 rounded-xl border border-border px-3 text-sm font-semibold text-fg bg-surface-sunken focus:outline-none focus:ring-2 focus:ring-focus-ring transition-all"
                >
                  <option value="applied">Applied</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="interview">Interview</option>
                  <option value="offered">Offered</option>
                  {selectedApplicant.stage === "accepted" && (
                    <option value="accepted" disabled>
                      Accepted (by student)
                    </option>
                  )}
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Stage Quick Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  variant="solid"
                  className="h-11 bg-success hover:bg-success text-fg-inverse font-bold"
                  onClick={() => handleStatusChange(selectedApplicant.id, "offered")}
                  isLoading={isUpdatingStage && selectedApplicant.stage === "offered"}
                  leftIcon={<CheckCircle className="w-4 h-4" />}
                >
                  Make Offer
                </Button>
                <Button
                  variant="outline"
                  className="h-11 border-danger text-danger-fg hover:bg-danger-subtle font-bold"
                  onClick={() => handleStatusChange(selectedApplicant.id, "rejected")}
                  isLoading={isUpdatingStage && selectedApplicant.stage === "rejected"}
                  leftIcon={<XCircle className="w-4 h-4" />}
                >
                  Reject
                </Button>
              </div>
            </div>

            {/* Quick Actions: View CV & Message */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-11"
                onClick={() => handleViewCv(selectedApplicant)}
                disabled={!selectedApplicant.profiles?.cv_url}
                leftIcon={<FileText className="w-4 h-4" />}
              >
                View CV
              </Button>
              <Button
                variant="outline"
                className="h-11"
                onClick={() => handleOpenMessage(selectedApplicant)}
                leftIcon={<MessageSquare className="w-4 h-4" />}
              >
                Send Message
              </Button>
            </div>

            {/* Cover Letter */}
            <div className="space-y-2">
              <Typography variant="subtitle2" weight="bold" className="text-fg-muted uppercase tracking-wider text-[11px]">
                Candidate Statement
              </Typography>
              <div className="p-4 rounded-xl bg-surface-sunken border border-border text-sm text-fg leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                {selectedApplicant.cover_letter || "The candidate did not provide a cover letter."}
              </div>
            </div>

            {/* Decision History Audit Trail */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Typography variant="subtitle2" weight="bold" className="text-fg-muted uppercase tracking-wider text-[11px]">
                Decision History
              </Typography>
              <DecisionTimeline applicationId={selectedApplicant.id} />
            </div>
          </div>
        )}
      </Drawer>

      {/* 5. In-App Messaging Modal */}
      {activeMessageApp && (
        <Modal
          isOpen={true}
          onClose={() => {
            setActiveMessageApp(null);
            setActiveConvoId(null);
          }}
          title={`Message ${activeMessageApp.profiles?.full_name || "Candidate"}`}
          size="lg"
        >
          <div className="h-[460px] flex flex-col">
            {isStartingConvo ? (
              <div className="flex-1 flex items-center justify-center text-fg-muted text-sm animate-pulse">
                Connecting to candidate...
              </div>
            ) : activeConvoId ? (
              <div className="flex-1 overflow-hidden p-2">
                <MessageThread
                  conversationId={activeConvoId}
                  currentUserId={(userProfile as { id?: string })?.id || ""}
                />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-fg-muted text-sm">
                Could not start conversation thread.
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
