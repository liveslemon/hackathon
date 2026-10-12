"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { isOpenInternship } from "@/lib/internship-columns";
import {
  Send,
  Clock,
  CheckCircle2,
  X,
  Sparkles,
  AlertTriangle,
  Loader2,
  FileText,
  User,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { Modal, Textarea, Button, StatusPill, Badge } from "@/components/ui";
import { cx } from "@/utils/cx";
import { authenticatedFetch, authenticatedFetchStream } from "@/lib/api";

interface InternshipClientPartsProps {
  internship: {
    id: string;
    company?: string;
    role?: string;
    status?: string | null;
    deadline?: string | null;
  };
  hasApplied: boolean;
  applicationStatus: string | null;
  applicationStage: string | null;
  applicationId: string | null;
  matchingSkills: string[];
  missingSkills: string[];
  userId: string;
  studentEmail?: string;
  hasCv?: boolean;
  isProfileComplete?: boolean;
}

export default function InternshipClientParts({
  internship,
  hasApplied: initialHasApplied,
  applicationStatus,
  applicationStage: initialStage,
  applicationId,
  matchingSkills,
  missingSkills,
  userId,
  hasCv = true,
  isProfileComplete = true,
}: InternshipClientPartsProps) {
  const [hasApplied, setHasApplied] = useState(initialHasApplied);
  const [isApplyModalOpen, setApplyModalOpen] = useState(false);
  const [isCvReviewModalOpen, setCvReviewModalOpen] = useState(false);
  const [applyStep, setApplyStep] = useState<1 | 2>(1); // 1: Write/AI, 2: Review & Confirm
  const [coverLetter, setCoverLetter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [currentStage, setCurrentStage] = useState(initialStage || "applied");
  const [isAccepting, setIsAccepting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleAcceptOffer = async () => {
    if (!applicationId) return;
    setIsAccepting(true);
    try {
      await authenticatedFetch(`/api/applications/${applicationId}/accept`, {
        method: "POST",
      });
      setCurrentStage("accepted");
      toast.success("Offer accepted! Your placement is now active.");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to accept offer.",
      );
    } finally {
      setIsAccepting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!applicationId || isWithdrawing) return;
    if (
      !window.confirm(
        "Are you sure you want to withdraw this application? This action cannot be undone.",
      )
    ) {
      return;
    }
    setIsWithdrawing(true);
    try {
      await authenticatedFetch(`/api/applications/${applicationId}/withdraw`, {
        method: "POST",
      });
      setCurrentStage("withdrawn");
      toast.success("Application withdrawn successfully.");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Failed to withdraw application.",
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleApply = async () => {
    if (coverLetter.trim().length < 10) {
      toast.error("Please provide a cover letter of at least 10 characters.");
      setApplyStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      await authenticatedFetch("/api/applications", {
        method: "POST",
        body: JSON.stringify({
          internship_id: internship.id,
          cover_letter: coverLetter,
        }),
      });

      setHasApplied(true);
      setApplyModalOpen(false);
      setApplyStep(1);
      toast.success(
        "Application submitted successfully! The employer has been notified.",
      );
    } catch (error: unknown) {
      console.error("Application error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit application.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDraftCoverLetter = async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsDrafting(true);

    try {
      const response = await authenticatedFetchStream(
        "/draft-cover-letter-stream",
        {
          method: "POST",
          signal: controller.signal,
          body: JSON.stringify({
            user_id: userId,
            internship_id: internship.id,
            existing_letter: coverLetter,
          }),
        },
      );

      if (!response.body)
        throw new Error("No response body returned from stream.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamFinished = false;

      // Reset text before stream starts
      setCoverLetter("");

      while (!streamFinished) {
        const { done, value } = await reader.read();
        if (done) {
          streamFinished = true;
          break;
        }
        if (value) {
          const chunkText = decoder.decode(value, { stream: true });
          let parsed = chunkText;
          if (parsed.includes("data:")) {
            parsed = "";
            const lines = chunkText.split(/\r?\n/);
            for (const line of lines) {
              if (line.startsWith("data:")) {
                const raw = line.substring(5).trim();
                if (raw === "[DONE]" || raw === "") continue;
                try {
                  const obj = JSON.parse(raw);
                  if (obj.delta && obj.delta.content !== undefined)
                    parsed += obj.delta.content;
                  else if (obj.content !== undefined) parsed += obj.content;
                  else if (obj.text !== undefined) parsed += obj.text;
                  else parsed += raw;
                } catch {
                  parsed += raw;
                }
              }
            }
          }
          setCoverLetter((prev) => prev + parsed);
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      console.error("Drafting stream error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "An error occurred while drafting the cover letter.",
      );
    } finally {
      setIsDrafting(false);
    }
  };

  const STAGES = [
    { key: "applied", label: "Applied" },
    { key: "reviewed", label: "Reviewed" },
    { key: "shortlisted", label: "Shortlisted" },
    { key: "interview", label: "Interview" },
    { key: "offered", label: "Offered" },
    { key: "accepted", label: "Accepted" },
  ];

  const currentStageIndex = STAGES.findIndex((s) => s.key === currentStage);
  const isRejected = currentStage === "rejected";
  const isWithdrawn = currentStage === "withdrawn";
  const isClosed = !hasApplied && !isOpenInternship(internship);

  return (
    <>
      {/* Stage Progress Tracker */}
      {hasApplied && !isRejected && !isWithdrawn && (
        <div className="mb-4 p-4 bg-surface-sunken rounded-2xl border border-border overflow-hidden w-full relative">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest">
              Application Progress
            </p>
            <StatusPill status={currentStage} size="sm" />
          </div>
          <div className="w-full overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            <div className="flex items-center gap-1 min-w-[340px]">
              {STAGES.map((stage, idx) => (
                <div key={stage.key} className="flex items-center flex-1 shrink-0">
                  <div className="flex flex-col items-center flex-1 w-full">
                    <div
                      className={cx(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shrink-0",
                        idx <= currentStageIndex
                          ? "bg-brand text-fg-inverse shadow-xs"
                          : "bg-surface text-fg-subtle border border-border",
                      )}
                    >
                      {idx < currentStageIndex ? "✓" : idx + 1}
                    </div>
                    <span
                      className={cx(
                        "text-[9px] mt-1 font-medium text-center leading-tight truncate px-1",
                        idx <= currentStageIndex
                          ? "text-brand font-semibold"
                          : "text-fg-subtle",
                      )}
                    >
                      {stage.label}
                    </span>
                  </div>
                  {idx < STAGES.length - 1 && (
                    <div
                      className={cx(
                        "h-0.5 flex-1 mx-0.5 rounded min-w-[12px]",
                        idx < currentStageIndex
                          ? "bg-brand"
                          : "bg-border",
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Accept Offer Button */}
      {currentStage === "offered" && (
        <button
          type="button"
          onClick={handleAcceptOffer}
          disabled={isAccepting}
          className="w-full mb-3 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-fg-inverse bg-success hover:opacity-90 disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
        >
          {isAccepting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          <span>Accept Offer</span>
        </button>
      )}

      {hasApplied && isRejected && (
        <div className="mb-4 p-4 bg-danger-subtle rounded-2xl border border-danger/20">
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-danger-fg" />
            <p className="text-sm font-semibold text-danger-fg">
              Application Not Successful
            </p>
          </div>
          <p className="text-xs text-danger-fg/80 mt-1">
            The employer has decided not to move forward with this position.
          </p>
        </div>
      )}

      {hasApplied && isWithdrawn && (
        <div className="mb-4 p-4 bg-surface-sunken rounded-2xl border border-border">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-fg-muted" />
            <p className="text-sm font-semibold text-fg">
              Application Withdrawn
            </p>
          </div>
          <p className="text-xs text-fg-muted mt-1">
            You have withdrawn your application for this internship.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {/* Action Button: Apply / Status / Complete profile / Upload CV */}
        {!hasApplied ? (
          !hasCv ? (
            <Link
              href="/dashboard/student/cv"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-fg-inverse bg-brand hover:bg-brand-hover transition-colors shadow-xs"
            >
              <FileText className="w-4 h-4" />
              <span>Upload CV to Apply</span>
            </Link>
          ) : !isProfileComplete ? (
            <Link
              href="/profile"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-fg-inverse bg-brand hover:bg-brand-hover transition-colors shadow-xs"
            >
              <User className="w-4 h-4" />
              <span>Complete Profile to Apply</span>
            </Link>
          ) : isClosed ? (
            <button
              type="button"
              disabled
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-fg-muted bg-surface-sunken border border-border cursor-not-allowed"
            >
              <Clock className="w-4 h-4" />
              <span>Applications Closed</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setApplyStep(1);
                setApplyModalOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-fg-inverse bg-brand hover:bg-brand-hover transition-colors shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Apply Now</span>
            </button>
          )
        ) : (
          <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium bg-surface-sunken border border-border text-fg">
            <CheckCircle2 className="w-4 h-4 text-success-fg" />
            <span>Applied on Portal</span>
          </div>
        )}

        {/* Withdraw Button if application in progress */}
        {hasApplied &&
          !["accepted", "rejected", "withdrawn"].includes(currentStage) && (
            <button
              type="button"
              onClick={handleWithdraw}
              disabled={isWithdrawing}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-danger-fg bg-danger-subtle hover:opacity-90 border border-danger/20 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isWithdrawing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              <span>Withdraw Application</span>
            </button>
          )}

        {/* AI CV Review Button */}
        <button
          type="button"
          onClick={() => setCvReviewModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-fg bg-surface border border-border hover:border-border-strong hover:bg-surface-sunken transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-brand" />
          <span>Keyword Match Analysis</span>
        </button>
      </div>

      {/* Apply Modal with Multi-Step Flow */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => {
          if (isSubmitting) return;
          abortControllerRef.current?.abort();
          setApplyModalOpen(false);
          setApplyStep(1);
        }}
        title={`Apply: ${internship.role || "Internship"}`}
        size="md"
        footer={
          <div className="flex gap-2 w-full">
            {applyStep === 1 ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleDraftCoverLetter}
                  disabled={isDrafting || isSubmitting}
                  className="flex-1 gap-1.5"
                >
                  {isDrafting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-brand" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-brand" />
                  )}
                  <span>
                    {isDrafting
                      ? coverLetter.trim()
                        ? "Enhancing..."
                        : "Drafting..."
                      : coverLetter.trim()
                        ? "Enhance with AI"
                        : "Draft with AI"}
                  </span>
                </Button>
                <Button
                  colorType="primary"
                  onClick={() => {
                    if (coverLetter.trim().length < 10) {
                      toast.error("Please enter at least 10 characters for your cover letter.");
                      return;
                    }
                    setApplyStep(2);
                  }}
                  disabled={isDrafting || coverLetter.trim().length < 10}
                  className="flex-1 gap-1.5"
                >
                  <span>Review Application</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setApplyStep(1)}
                  disabled={isSubmitting}
                  className="flex-1 gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Edit Letter</span>
                </Button>
                <Button
                  colorType="primary"
                  onClick={handleApply}
                  isLoading={isSubmitting}
                  className="flex-1 gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Confirm & Submit</span>
                </Button>
              </>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
            <span
              className={cx(
                "px-2.5 py-0.5 rounded-full text-xs font-bold",
                applyStep === 1
                  ? "bg-brand text-fg-inverse"
                  : "bg-surface-sunken text-fg-muted",
              )}
            >
              1. Statement
            </span>
            <span className="text-fg-subtle text-xs">→</span>
            <span
              className={cx(
                "px-2.5 py-0.5 rounded-full text-xs font-bold",
                applyStep === 2
                  ? "bg-brand text-fg-inverse"
                  : "bg-surface-sunken text-fg-muted",
              )}
            >
              2. Review & Confirm
            </span>
          </div>

          {applyStep === 1 ? (
            <>
              <div className="bg-brand-subtle/50 p-4 rounded-xl border border-brand/20">
                <p className="text-xs font-bold text-brand uppercase tracking-wider mb-1">
                  Why you?
                </p>
                <p className="text-xs text-fg-muted leading-relaxed">
                  Highlight why you are enthusiastic about joining{" "}
                  <strong>{internship.company}</strong> and which relevant coursework
                  or projects prepare you for this role.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-fg">
                  Cover Letter / Personal Statement
                </label>
                <div className="min-h-[160px] relative">
                  <textarea
                    ref={textareaRef}
                    rows={7}
                    placeholder="Describe your background and motivation for this role..."
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    disabled={isSubmitting || isDrafting}
                    className="w-full p-3 rounded-xl border border-border bg-surface text-fg text-sm placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-focus-ring resize-y"
                  />
                  {isDrafting && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-xs text-brand font-medium bg-surface/90 px-2 py-1 rounded-md border border-border shadow-xs">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Streaming AI draft…</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center text-[11px] text-fg-subtle">
                  <span>Minimum 10 characters</span>
                  <span
                    className={
                      coverLetter.trim().length >= 10
                        ? "text-success-fg font-medium"
                        : "text-fg-subtle"
                    }
                  >
                    {coverLetter.trim().length} chars
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-surface-sunken p-4 rounded-xl border border-border space-y-2">
                <p className="text-xs font-bold text-fg-muted uppercase tracking-wider">
                  Target Opportunity
                </p>
                <p className="text-base font-bold text-fg">
                  {internship.role}
                </p>
                <p className="text-xs text-brand font-medium">
                  {internship.company}
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-bold text-fg-muted uppercase tracking-wider">
                  Your Cover Letter
                </p>
                <div className="p-3.5 rounded-xl border border-border bg-surface text-xs text-fg leading-relaxed max-h-48 overflow-y-auto whitespace-pre-line">
                  {coverLetter}
                </div>
              </div>

              <p className="text-xs text-fg-muted">
                Your primary profile information and attached CV will be shared
                with the hiring supervisor upon submission.
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* AI Keyword Analysis Modal */}
      <Modal
        isOpen={isCvReviewModalOpen}
        onClose={() => setCvReviewModalOpen(false)}
        title="Keyword Match Diagnostics"
        size="md"
      >
        <div className="space-y-5">
          <p className="text-xs text-fg-muted leading-relaxed">
            Comparison between your CV skills and the posted requirements for{" "}
            <span className="font-semibold text-fg">
              {internship.role || "this position"}
            </span>
            .
          </p>

          <div className="space-y-4">
            {matchingSkills.length > 0 && (
              <div className="bg-success-subtle border border-success/20 p-4 rounded-xl space-y-2.5">
                <div className="flex items-center gap-2 text-success-fg font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Matched Skills ({matchingSkills.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {matchingSkills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-2.5 py-1 bg-surface text-success-fg border border-success/30 rounded-lg text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {missingSkills.length > 0 && (
              <div className="bg-warning-subtle border border-warning/20 p-4 rounded-xl space-y-2.5">
                <div className="flex items-center gap-2 text-warning-fg font-semibold text-xs">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Missing Keywords ({missingSkills.length})</span>
                </div>
                <p className="text-xs text-fg-muted leading-relaxed">
                  Employers specifically highlight:{" "}
                  <strong className="text-fg">{missingSkills.join(", ")}</strong>.
                  Consider adding related projects or coursework to your profile.
                </p>
              </div>
            )}

            {matchingSkills.length === 0 && missingSkills.length === 0 && (
              <div className="bg-surface-sunken border border-border p-6 rounded-xl text-center">
                <p className="text-xs text-fg-muted">
                  No automated keyword overlap available for this listing yet.
                </p>
              </div>
            )}

            <Button
              onClick={() => setCvReviewModalOpen(false)}
              colorType="primary"
              className="w-full mt-2"
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
