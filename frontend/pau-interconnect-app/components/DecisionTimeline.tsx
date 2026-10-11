"use client";
import React, { useState, useEffect } from "react";
import { Typography } from "@/components/ui";

export function DecisionTimeline({ applicationId }: { applicationId: string }) {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const res = await fetch(`/api/audit/${applicationId}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    };
    fetchHistory();
  }, [applicationId]);

  return (
    <div className="mt-4 border-t pt-4">
      <Typography
        variant="caption"
        weight="bold"
        className="text-slate-500 uppercase tracking-wider mb-2"
      >
        Decision History
      </Typography>
      <div className="space-y-2">
        {history.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 text-xs">
            <div className="w-2 h-2 bg-slate-300 rounded-full mt-1.5 shrink-0" />
            <div>
              <span className="font-medium">
                {entry.action.replace(/_/g, " ")}
              </span>
              {entry.details?.reason && (
                <span className="text-slate-500 ml-1">
                  — "{entry.details.reason}"
                </span>
              )}
              {entry.details?.notes && (
                <span className="text-slate-500 ml-1">
                  — "{entry.details.notes}"
                </span>
              )}
              <p className="text-slate-400">
                {new Date(entry.created_at).toLocaleDateString()} at{" "}
                {new Date(entry.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {history.length === 0 && (
          <Typography variant="caption" color="muted">
            No decisions recorded yet
          </Typography>
        )}
      </div>
    </div>
  );
}
