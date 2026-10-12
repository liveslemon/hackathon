"use client";

import React from "react";
import Link from "next/link";
import { Loader2, Sparkles, UploadCloud } from "lucide-react";
import { MatchScoreData, getScoreColorBadge } from "@/lib/matching";

export interface MatchScoreProps {
  scoreData?: MatchScoreData | null;
  score?: number | null;
  variant?: "badge" | "detailed" | "compact";
  showExplanation?: boolean;
  className?: string;
  unavailableHref?: string;
}

export function MatchScore({
  scoreData,
  score,
  variant = "badge",
  showExplanation = false,
  className = "",
  unavailableHref = "/dashboard/student/cv",
}: MatchScoreProps) {
  // Determine effective state and score
  let state = scoreData?.state;
  let finalScore = scoreData?.score;

  if (!state) {
    if (typeof score === "number" && score > 0) {
      state = "scored";
      finalScore = score;
    } else {
      state = "unavailable";
    }
  }

  if (state === "pending") {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse ${className}`}
        title="We are calculating your compatibility score"
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Calculating…</span>
      </div>
    );
  }

  if (state === "unavailable" || finalScore === null || finalScore === undefined) {
    if (variant === "compact") {
      return (
        <span className={`text-xs text-fg-muted ${className}`}>
          Unscored
        </span>
      );
    }
    return (
      <Link
        href={unavailableHref}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-surface-sunken text-fg-muted hover:text-fg hover:bg-secondary transition-colors border border-border/50 ${className}`}
        title="Upload your CV or complete your profile to calculate match score"
      >
        <UploadCloud className="w-3.5 h-3.5" />
        <span>Upload CV to match</span>
      </Link>
    );
  }

  const badgeColors = getScoreColorBadge(finalScore);

  if (variant === "compact") {
    return (
      <span className={`font-semibold ${badgeColors.text} ${className}`}>
        {finalScore}%
      </span>
    );
  }

  const activeExplanation = scoreData?.aiReasoning || scoreData?.instantReasoning;
  const isAiExplanation = scoreData?.isAi && Boolean(scoreData?.aiReasoning);

  return (
    <div className={`inline-flex flex-col gap-1.5 ${className}`}>
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeColors.bg} ${badgeColors.text} ${badgeColors.border}`}
      >
        <span>{finalScore}% match</span>
        {isAiExplanation && (
          <span className="inline-flex items-center gap-0.5 text-[10px] font-normal uppercase tracking-wider px-1 py-0.2 rounded bg-brand/10 text-brand">
            <Sparkles className="w-2.5 h-2.5" />
            AI
          </span>
        )}
      </div>

      {showExplanation && activeExplanation && (
        <div className="text-xs text-fg-muted bg-surface-sunken/40 p-2.5 rounded-lg border border-border/40 mt-1">
          {isAiExplanation && (
            <div className="flex items-center gap-1 text-[11px] font-medium text-brand mb-1">
              <Sparkles className="w-3 h-3" />
              <span>AI summary</span>
            </div>
          )}
          <p className="leading-relaxed">{activeExplanation}</p>
        </div>
      )}
    </div>
  );
}

export default MatchScore;
