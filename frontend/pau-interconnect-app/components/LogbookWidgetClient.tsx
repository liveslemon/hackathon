"use client";

import { useState } from "react";
import { BookOpen, CheckCircle2, AlertTriangle, X } from "lucide-react";
import Link from "next/link";

interface LogbookWidgetClientProps {
  isMissing: boolean;
  todayStatus: string | null;
}

export default function LogbookWidgetClient({
  isMissing,
  todayStatus,
}: LogbookWidgetClientProps) {
  const [isVisible, setIsVisible] = useState(() => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const dismissed = localStorage.getItem(
        `logbook_reminder_dismissed_${todayStr}`,
      );
      return dismissed !== "true";
    } catch (e) {
      console.warn("localStorage is not available:", e);
      return true;
    }
  });

  const handleDismiss = () => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      localStorage.setItem(`logbook_reminder_dismissed_${todayStr}`, "true");
    } catch (e) {
      console.warn("Failed to set localStorage:", e);
    }
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 pr-12 rounded-2xl border transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
        isMissing
          ? "bg-amber-50/60 border-amber-100/80 shadow-[0_2px_8px_rgba(245,158,11,0.04)]"
          : "bg-emerald-50/60 border-emerald-100/80 shadow-[0_2px_8px_rgba(16,185,129,0.04)]"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isMissing
              ? "bg-amber-100/80 text-amber-600"
              : "bg-emerald-100/80 text-emerald-600"
          }`}
        >
          {isMissing ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">
            {isMissing ? "Today's log is missing" : "Today's log submitted"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            {isMissing
              ? "Record your progress in the logbook before the end of the day"
              : `Status: ${todayStatus}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link href="/dashboard/student/logbook" className="no-underline">
          <button
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              isMissing
                ? "bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/10 active:scale-95"
                : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:scale-95"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Open Logbook
          </button>
        </Link>
      </div>

      <button
        onClick={handleDismiss}
        className="absolute top-1/2 -translate-y-1/2 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 transition-all active:scale-90"
        aria-label="Close reminder"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
