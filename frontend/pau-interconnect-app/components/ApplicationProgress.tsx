import React from "react";
import { cx } from "@/utils/cx";
import { Typography } from "@/components/ui";

export function ApplicationProgress({ stage }: { stage?: string }) {
  const stages = [
    "applied",
    "reviewed",
    "shortlisted",
    "interview",
    "offered",
    "accepted",
  ];
  const currentStageName = stage && stage !== "pending" ? stage : "applied";

  if (currentStageName === "rejected") {
    return (
      <div className="flex items-center gap-2 w-full mt-2 bg-danger-subtle px-3 py-1.5 rounded-xl border border-danger/20">
        <Typography variant="caption" className="text-danger-fg font-bold">
          Application Rejected
        </Typography>
      </div>
    );
  }

  if (currentStageName === "withdrawn") {
    return (
      <div className="flex items-center gap-2 w-full mt-2 bg-surface-sunken px-3 py-1.5 rounded-xl border border-border">
        <Typography variant="caption" className="text-fg-muted font-bold">
          Application Withdrawn
        </Typography>
      </div>
    );
  }

  const currentIndex = stages.indexOf(currentStageName);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="flex items-center w-full mt-2 bg-surface-sunken px-3 py-2 rounded-xl border border-border">
      <div className="flex items-center w-full relative">
        {stages.map((s, i) => (
          <div key={s} className="relative flex flex-col items-center flex-1">
            <div
              className={cx(
                "w-2.5 h-2.5 rounded-full z-10 transition-colors",
                i <= safeIndex ? "bg-brand" : "bg-border-strong",
              )}
            />
          </div>
        ))}
        {/* Progress connecting lines */}
        <div className="absolute top-[4px] left-0 w-full h-[2px] flex items-center justify-between px-[8px] pointer-events-none">
          <div className="h-full bg-border-strong w-full rounded-full" />
          <div
            className="absolute top-0 left-[8px] h-full bg-brand rounded-full transition-all duration-300"
            style={{
              width: `calc(${Math.min(100, (safeIndex / (stages.length - 1)) * 100)}% - 16px)`,
            }}
          />
        </div>
      </div>
      <Typography
        variant="caption"
        className="ml-3 capitalize text-fg-muted text-[10px] font-bold w-16 text-right shrink-0"
      >
        {currentStageName}
      </Typography>
    </div>
  );
}
