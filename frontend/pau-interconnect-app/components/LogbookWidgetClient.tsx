"use client";

import { useState } from "react";
import { BookOpen, CheckCircle2, AlertTriangle, X } from "lucide-react";
import Link from "next/link";
import { todayInLagos } from "@/lib/logbook-dates";

interface LogbookWidgetClientProps {
  isMissing: boolean;
  todayStatus: string | null;
}

export default function LogbookWidgetClient({
  isMissing,
  todayStatus,
}: LogbookWidgetClientProps) {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const todayStr = todayInLagos();
      const dismissed = localStorage.getItem(
        `logbook_reminder_dismissed_${todayStr}`,
      );
      return dismissed !== "true";
    } catch {
      return true;
    }
  });

  const handleDismiss = () => {
    try {
      const todayStr = todayInLagos();
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
          ? "bg-warning-subtle border-warning/30"
          : "bg-success-subtle border-success/30"
      }`}
    >
      <div className="flex items-center gap-3.5">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isMissing
              ? "bg-warning/15 text-warning-fg"
              : "bg-success/15 text-success-fg"
          }`}
        >
          {isMissing ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
        </div>
        <div>
          <p className="text-sm font-bold text-fg">
            {isMissing ? "Today's daily log is missing" : "Today's daily log submitted"}
          </p>
          <p className="text-xs text-fg-muted mt-0.5 font-medium">
            {isMissing
              ? "Record your industrial activities in your SIWES logbook before the end of the day."
              : `Status: ${todayStatus}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link href="/dashboard/student/logbook" className="no-underline">
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              isMissing
                ? "bg-warning text-fg-inverse hover:opacity-90 shadow-xs"
                : "bg-surface text-fg border border-border hover:bg-surface-sunken"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Open Logbook</span>
          </button>
        </Link>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-1/2 -translate-y-1/2 right-3.5 p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-sunken transition-all cursor-pointer"
        aria-label="Close reminder"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
