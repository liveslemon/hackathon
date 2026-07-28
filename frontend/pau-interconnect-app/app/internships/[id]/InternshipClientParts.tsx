"use client";

import { useState } from "react";
import {
  Send,
  Clock,
  CheckCircle2,
  X,
  Sparkles,
  AlertTriangle,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { Modal, Textarea } from "@/components/ui";
import { cx } from "@/utils/cx";
import { authenticatedFetch, authenticatedFetchStream } from "@/lib/api";

interface InternshipClientPartsProps {
  internship: { id: string; company?: string; role?: string };
  hasApplied: boolean;
  applicationStatus: string | null;
  matchingSkills: string[];
  missingSkills: string[];
  userId: string;
  studentEmail?: string;
}

export default function InternshipClientParts({
  internship,
  hasApplied: initialHasApplied,
  applicationStatus,
  matchingSkills,
  missingSkills,
  userId,
  studentEmail,
}: InternshipClientPartsProps) {
  const [hasApplied, setHasApplied] = useState(initialHasApplied);
  const [isApplyModalOpen, setApplyModalOpen] = useState(false);
  const [isCvReviewModalOpen, setCvReviewModalOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [isReviewing] = useState(false);

  const handleApply = async () => {
    if (coverLetter.trim().length < 10) {
      alert("Please provide a cover letter of at least 10 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authenticatedFetch("/submit-application", {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          internship_id: internship.id,
          cover_letter: coverLetter,
          student_email: studentEmail,
        }),
      });

      setHasApplied(true);
      setApplyModalOpen(false);
      alert(
        "Application submitted successfully! The employer has been notified.",
      );
    } catch (error: unknown) {
      console.error("Application error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to submit application.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDraftCoverLetter = async () => {
    setIsDrafting(true);

    // Clear letter only if drafting from scratch
    if (!coverLetter) {
      setCoverLetter("");
    }

    try {
      const response = await authenticatedFetchStream(
        "/draft-cover-letter-stream",
        {
          method: "POST",
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
      console.error("Drafting stream error:", error);
      alert(
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
  };

  const appStatus = applicationStatus?.toLowerCase() || "";
  const statusData = hasApplied
    ? statusConfig[appStatus] || statusConfig.pending
    : null;

  return (
    <>
      <div className="space-y-2.5">
        {/* Apply / Status Button */}
        <button
          onClick={() => !hasApplied && setApplyModalOpen(true)}
          disabled={hasApplied}
          className={cx(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors",
            hasApplied
              ? cx(
                  "cursor-default opacity-90",
                  statusData?.className || "bg-indigo-600",
                )
              : "bg-slate-800 hover:bg-slate-700",
          )}
        >
          {hasApplied && statusData ? (
            <>
              <statusData.icon className="w-4 h-4" />
              {statusData.label}
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Apply Now
            </>
          )}
        </button>

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
        onClose={() => !isSubmitting && setApplyModalOpen(false)}
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
