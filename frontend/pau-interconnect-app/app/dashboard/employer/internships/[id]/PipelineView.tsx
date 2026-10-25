"use client";

import React from "react";
import { Typography, Badge, Button } from "@/components/ui";
import { MatchScore } from "@/components/match/MatchScore";
import { GripVertical, ArrowRight, X } from "lucide-react";


const STAGES = [
  { key: "applied", label: "Applied" },
  { key: "reviewed", label: "Reviewed" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview", label: "Interview" },
  { key: "offered", label: "Offered" },
  { key: "accepted", label: "Accepted" },
  // Students withdraw themselves; employers can't move these applications.
  { key: "withdrawn", label: "Withdrawn", final: true },
];

const getNextStage = (current: string) => {
  const currentIndex = STAGES.findIndex((s) => s.key === current);
  // Employers cannot advance past "offered" — only the student can accept
  if (
    currentIndex === -1 ||
    currentIndex >= STAGES.length - 1 ||
    current === "offered" ||
    STAGES[currentIndex].final ||
    STAGES[currentIndex + 1].final
  )
    return null;
  return STAGES[currentIndex + 1].key;
};

export function PipelineView({
  applicants,
  onStageChange,
  onSelectApplicant,
}: {
  applicants: any[];
  onStageChange: (id: string, stage: string) => void;
  onSelectApplicant?: (applicant: any) => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-2 scrollbar-thin">
      {STAGES.map((stage) => {
        const stageApplicants = applicants.filter(
          (a) => (a.stage || "applied") === stage.key,
        );
        return (
          <div
            key={stage.key}
            className="min-w-[280px] max-w-[320px] shrink-0 bg-surface-sunken border border-border rounded-2xl p-4 flex flex-col"
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <Typography variant="body2" weight="bold" className="text-fg font-semibold">
                {stage.label}
              </Typography>
              <Badge variant={stageApplicants.length > 0 ? "primary" : "slate"}>
                {stageApplicants.length}
              </Badge>
            </div>
            <div className="space-y-3 flex-1 min-h-[120px]">
              {stageApplicants.length === 0 ? (
                <div className="h-24 rounded-xl border border-dashed border-border/80 flex items-center justify-center text-xs text-fg-subtle">
                  No candidates
                </div>
              ) : (
                stageApplicants.map((applicant) => (
                  <ApplicantStageCard
                    key={applicant.id}
                    applicant={applicant}
                    readOnly={stage.final}
                    onSelect={() => onSelectApplicant?.(applicant)}
                    onAdvance={() => {
                      const next = getNextStage(stage.key);
                      if (next) onStageChange(applicant.id, next);
                    }}
                    onReject={() => onStageChange(applicant.id, "rejected")}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApplicantStageCard({
  applicant,
  readOnly,
  onSelect,
  onAdvance,
  onReject,
}: {
  applicant: any;
  readOnly?: boolean;
  onSelect: () => void;
  onAdvance: () => void;
  onReject: () => void;
}) {
  const nextStage = getNextStage(applicant.stage || "applied");

  return (
    <div
      onClick={onSelect}
      className="bg-surface rounded-xl p-4 shadow-sm border border-border hover:border-border-strong hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Typography
            variant="body2"
            weight="bold"
            className="text-fg group-hover:text-brand transition-colors truncate"
          >
            {applicant.profiles?.full_name || "Unknown Student"}
          </Typography>
          <Typography variant="caption" color="muted" className="truncate block mt-0.5">
            {applicant.profiles?.course || "Course N/A"}
          </Typography>
        </div>
        <div className="text-fg-subtle shrink-0 p-0.5" title="Drag affordance">
          <GripVertical className="w-4 h-4 opacity-40 group-hover:opacity-80 transition-opacity" />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border/60">
        <MatchScore score={applicant.match_score} variant="compact" />

        {!readOnly && (
          <div
            className="flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {nextStage && (
              <Button
                size="xs"
                variant="subtle"
                onClick={onAdvance}
                className="text-[11px] h-7 px-2 font-semibold text-brand hover:bg-brand-subtle"
                rightIcon={<ArrowRight className="w-3 h-3" />}
              >
                Advance
              </Button>
            )}
            <Button
              size="xs"
              variant="ghost"
              onClick={onReject}
              className="text-[11px] h-7 px-2 text-danger-fg hover:bg-danger-subtle font-semibold"
              aria-label="Reject candidate"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
