import React from 'react';
import { cx } from "@/utils/cx";
import { Typography } from "@/components/ui";

export function ApplicationProgress({ stage }: { stage?: string }) {
  const stages = ["applied", "reviewed", "shortlisted", "interview", "offered", "accepted"];
  const currentStageName = (stage && stage !== "pending") ? stage : "applied";
  
  if (currentStageName === "rejected") {
    return (
      <div className="flex items-center gap-2 w-full mt-2 bg-red-50 p-2 rounded-lg border border-red-100">
        <Typography variant="caption" className="text-red-600 font-bold ml-1">Application Rejected</Typography>
      </div>
    );
  }

  if (currentStageName === "withdrawn") {
    return (
      <div className="flex items-center gap-2 w-full mt-2 bg-slate-100 p-2 rounded-lg border border-slate-200">
        <Typography variant="caption" className="text-slate-600 font-bold ml-1">Application Withdrawn</Typography>
      </div>
    );
  }

  const currentIndex = stages.indexOf(currentStageName);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;

  return (
    <div className="flex items-center w-full mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
      <div className="flex items-center w-full relative">
        {stages.map((s, i) => (
          <React.Fragment key={s}>
            <div className="relative flex flex-col items-center flex-1">
              <div className={cx(
                "w-2.5 h-2.5 rounded-full z-10",
                i <= safeIndex ? "bg-indigo-500" : "bg-slate-200"
              )} />
            </div>
          </React.Fragment>
        ))}
        {/* Progress connecting lines */}
        <div className="absolute top-[3px] left-0 w-full h-[3px] flex items-center justify-between px-[10px] pointer-events-none">
             <div className="h-full bg-slate-200 w-full rounded-full" />
             <div 
               className="absolute top-0 left-[10px] h-full bg-indigo-500 rounded-full transition-all" 
               style={{ width: `calc(${Math.min(100, (safeIndex / (stages.length - 1)) * 100)}% - 20px)` }} 
             />
        </div>
      </div>
      <Typography variant="caption" className="ml-3 capitalize text-slate-500 text-[10px] font-bold w-16 text-right shrink-0">
        {currentStageName}
      </Typography>
    </div>
  );
}
