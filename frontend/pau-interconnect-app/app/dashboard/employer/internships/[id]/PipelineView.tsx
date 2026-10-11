"use client";
import React from "react";
import { Typography, Badge } from "@/components/ui";

const STAGES = [
  { key: "applied", label: "Applied", color: "bg-slate-100" },
  { key: "reviewed", label: "Reviewed", color: "bg-blue-50" },
  { key: "shortlisted", label: "Shortlisted", color: "bg-purple-50" },
  { key: "interview", label: "Interview", color: "bg-amber-50" },
  { key: "offered", label: "Offered", color: "bg-green-50" },
  { key: "accepted", label: "Accepted", color: "bg-emerald-50" },
];

const getNextStage = (current: string) => {
  const currentIndex = STAGES.findIndex((s) => s.key === current);
  // Employers cannot advance past "offered" — only the student can accept
  if (
    currentIndex === -1 ||
    currentIndex >= STAGES.length - 1 ||
    current === "offered"
  )
    return null;
  return STAGES[currentIndex + 1].key;
};

export function PipelineView({
  applicants,
  onStageChange,
}: {
  applicants: any[];
  onStageChange: (id: string, stage: string) => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage) => {
        const stageApplicants = applicants.filter(
          (a) => (a.stage || "applied") === stage.key,
        );
        return (
          <div
            key={stage.key}
            className={`min-w-[250px] ${stage.color} rounded-xl p-4`}
          >
            <div className="flex items-center justify-between mb-3">
              <Typography variant="body2" weight="bold">
                {stage.label}
              </Typography>
              <Badge variant="primary">{stageApplicants.length}</Badge>
            </div>
            <div className="space-y-2">
              {stageApplicants.map((applicant) => (
                <ApplicantStageCard
                  key={applicant.id}
                  applicant={applicant}
                  onAdvance={() => {
                    const next = getNextStage(stage.key);
                    if (next) onStageChange(applicant.id, next);
                  }}
                  onReject={() => onStageChange(applicant.id, "rejected")}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ApplicantStageCard({
  applicant,
  onAdvance,
  onReject,
}: {
  applicant: any;
  onAdvance: () => void;
  onReject: () => void;
}) {
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm border border-slate-100">
      <Typography variant="body2" weight="bold">
        {applicant.profiles?.full_name}
      </Typography>
      <Typography variant="caption" color="muted">
        {applicant.profiles?.course}
      </Typography>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-brand font-medium">
          {applicant.match_score || 0}% match
        </span>
      </div>
      <div className="flex gap-1 mt-2">
        <button
          onClick={onAdvance}
          className="text-xs text-green-600 hover:underline"
        >
          Advance →
        </button>
        <button
          onClick={onReject}
          className="text-xs text-red-500 hover:underline"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
