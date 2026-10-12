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
  type LucideIcon,
} from "lucide-react";
import { Modal, Textarea } from "@/components/ui";
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
  const [coverLetter, setCoverLetter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isReviewing] = useState(false);
  const [currentStage, setCurrentStage] = useState(initialStage || "applied");
  const [isAccepting, setIsAccepting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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
        "Are you sure you want to withdraw this application? This cannot be undone.",
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

      // Clear letter before stream starts appending if we are replacing it
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

  const statusConfig: Record<
    string,
    { label: string; icon: LucideIcon; className: string }
  > = {
    accepted: {
      label: "Application Approved",
      icon: CheckCircle2,
      className: "bg-emerald-600 hover:bg-emerald-600",
    },
    rejected: {
      label: "Application Denied",
      icon: X,
      className: "bg-red-500 hover:bg-red-500",
    },
    withdrawn: {
      label: "Application Withdrawn",
      icon: X,
      className: "bg-slate-500 hover:bg-slate-500",
    },
    pending: {
      label: "Application Pending",
      icon: Clock,
      className: "bg-indigo-600 hover:bg-indigo-600",
    },
    applied: {
      label: "Application Pending",
      icon: Clock,
      className: "bg-indigo-600 hover:bg-indigo-600",
    },
    reviewed: {
      label: "Under Review",
      icon: Clock,
      className: "bg-indigo-600 hover:bg-indigo-600",
    },
    shortlisted: {
      label: "Shortlisted",
      icon: CheckCircle2,
      className: "bg-purple-600 hover:bg-purple-600",
    },
    interview: {
      label: "Interview Scheduled",
      icon: Sparkles,
      className: "bg-blue-600 hover:bg-blue-600",
    },
    offered: {
      label: "Offer Received",
      icon: CheckCircle2,
      className: "bg-emerald-600 hover:bg-emerald-600",
    },
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

  const appStatus = applicationStatus?.toLowerCase() || "";
  const isClosed = !hasApplied && !isOpenInternship(internship);
  const currentKey = currentStage?.toLowerCase() || appStatus;
  const statusData = hasApplied
    ? statusConfig[currentKey] || statusConfig[appStatus] || statusConfig.pending
    : null;

  return (
    <>
      {/* Stage Progress Tracker */}
      {hasApplied && !isRejected && !isWithdrawn && (
        <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100 overflow-hidden w-full relative">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            Application Progress
          </p>
          <div className="w-full overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <style>{`.overflow-x-auto::-webkit-scrollbar { display: none; }`}</style>
            <div className="flex items-center gap-1 min-w-[340px]">
              {STAGES.map((stage, idx) => (
                <div key={stage.key} className="flex items-center flex-1 shrink-0">
                  <div className="flex flex-col items-center flex-1 w-full">
                    <div
                      className={cx(
                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shrink-0",
                        idx <= currentStageIndex
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-200 text-slate-400",
                      )}
                    >
                      {idx < currentStageIndex ? "✓" : idx + 1}
                    </div>
                    <span
                      className={cx(
                        "text-[9px] mt-1 font-medium text-center leading-tight truncate px-1",
                        idx <= currentStageIndex
                          ? "text-indigo-600"
                          : "text-slate-400",
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
                          ? "bg-indigo-600"
                          : "bg-slate-200",
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
          onClick={handleAcceptOffer}
          disabled={isAccepting}
          className="w-full mb-3 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {isAccepting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          Accept Offer
        </button>
      )}

      {hasApplied && isRejected && (
        <div className="mb-4 p-4 bg-red-50 rounded-xl border border-red-100">
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-red-500" />
            <p className="text-sm font-semibold text-red-600">
              Application not successful
            </p>
          </div>
          <p className="text-xs text-red-400 mt-1">
            Unfortunately, the employer has decided not to proceed with your
            application.
          </p>
        </div>
      )}

      {hasApplied && isWithdrawn && (
        <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-700">
              Application Withdrawn
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            You have withdrawn your application for this internship.
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {/* Action Button: Apply / Status / Complete profile / Upload CV */}
        {!hasApplied ? (
          !hasCv ? (
            <Link
              href="/dashboard/student/cv"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Upload CV to Apply
            </Link>
          ) : !isProfileComplete ? (
            <Link
              href="/profile"
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              <User className="w-4 h-4" />
              Complete Profile to Apply
            </Link>
          ) : isClosed ? (
            <button
              disabled
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-slate-400 cursor-not-allowed"
            >
              <Clock className="w-4 h-4" />
              Applications closed
            </button>
          ) : (
            <button
              onClick={() => setApplyModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              <Send className="w-4 h-4" />
              Apply Now
            </button>
          )
        ) : (
          <button
            disabled
            className={cx(
              "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white cursor-default opacity-90",
              statusData?.className || "bg-indigo-600",
            )}
          >
            {statusData ? (
              <>
                <statusData.icon className="w-4 h-4" />
                {statusData.label}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Applied
              </>
            )}
          </button>
        )}

        {/* Withdraw Button if application in progress */}
        {hasApplied &&
          !["accepted", "rejected", "withdrawn"].includes(currentStage) && (
            <button
              onClick={handleWithdraw}
              disabled={isWithdrawing}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 disabled:opacity-50 transition-colors"
            >
              {isWithdrawing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              Withdraw Application
            </button>
          )}

        {/* AI Review Button */}
        <button
          onClick={() => setCvReviewModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-slate-600 bg-slate-50 border border-slate-150 hover:border-slate-300 hover:bg-slate-100 transition-all"
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          AI CV Review
        </button>
      </div>

      {/* Apply Modal */}
      <Modal
        isOpen={isApplyModalOpen}
        onClose={() => {
          if (isSubmitting) return;
          abortControllerRef.current?.abort();
          setApplyModalOpen(false);
        }}
        title="Apply"
        size="md"
        footer={
          <div className="flex gap-2 w-full">
            <button
              onClick={handleDraftCoverLetter}
              disabled={isDrafting || isSubmitting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 hover:border-slate-300 disabled:opacity-50 transition-all"
            >
              {isDrafting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-500" />
              )}
              {isDrafting
                ? coverLetter.trim()
                  ? "Enhancing..."
                  : "Drafting..."
                : coverLetter.trim()
                  ? "Enhance with AI"
                  : "Draft with AI"}
            </button>
            <button
              onClick={handleApply}
              disabled={isSubmitting || isDrafting}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Submit
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-indigo-50/70 p-4 rounded-lg border border-indigo-100">
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">
              Why you?
            </p>
            <p className="text-sm text-slate-600">
              Share a brief statement about why you&apos;re interested in this
              role at {internship.company}.
            </p>
          </div>

          <Textarea
            label="Cover Letter"
            placeholder="Tell us about yourself and why you're a good fit..."
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            disabled={isSubmitting}
            rows={6}
          />
        </div>
      </Modal>

      {/* AI Review Modal */}
      <Modal
        isOpen={isCvReviewModalOpen}
        onClose={() => !isReviewing && setCvReviewModalOpen(false)}
        title="Keyword Analysis"
        size="md"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-400">
            Your profile compared against the requirements for{" "}
            <span className="font-medium text-slate-600">
              {internship.role || "this position"}
            </span>
            .
          </p>

          <div className="space-y-4">
            {matchingSkills.length > 0 && (
              <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-semibold">Matched skills</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {matchingSkills.map((skill, index) => (
                    <span
                      key={index}
                      className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {missingSkills.length > 0 && (
              <div className="bg-amber-50/60 border border-amber-100 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-semibold">
                    Missing keywords
                  </span>
                </div>
                <p className="text-sm text-amber-800/70 leading-relaxed">
                  Recruiters look for{" "}
                  <strong>{missingSkills.join(", ")}</strong>. Consider adding
                  these to your profile if applicable.
                </p>
              </div>
            )}

            {matchingSkills.length === 0 && missingSkills.length === 0 && (
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-xl text-center">
                <p className="text-sm text-slate-400">
                  Resume analysis is still processing or unavailable for this
                  listing.
                </p>
              </div>
            )}

            <button
              onClick={() => setCvReviewModalOpen(false)}
              className="w-full py-2.5 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-colors mt-2"
            >
              Got it
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
