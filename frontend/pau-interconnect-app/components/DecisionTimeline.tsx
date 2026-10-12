"use client";
import React, { useState, useEffect } from "react";
import { Typography } from "@/components/ui";

interface AuditLogEntry {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details?: {
    reason?: string;
    notes?: string;
    from_stage?: string;
    to_stage?: string;
    from_status?: string;
    to_status?: string;
  };
  created_at: string;
}

export function DecisionTimeline({ applicationId }: { applicationId: string }) {
  const [history, setHistory] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/audit/${applicationId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            setHistory(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch audit history:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [applicationId]);

  return (
    <div className="mt-4 border-t pt-4">
      <Typography
        variant="caption"
        weight="bold"
        className="text-slate-500 uppercase tracking-wider mb-2 block"
      >
        Decision History
      </Typography>
      {loading ? (
        <Typography variant="caption" color="muted">
          Loading timeline...
        </Typography>
      ) : (
        <div className="space-y-2">
          {history.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3 text-xs">
              <div className="w-2 h-2 bg-slate-300 rounded-full mt-1.5 shrink-0" />
              <div>
                <span className="font-medium capitalize text-slate-800">
                  {entry.action.replace(/_/g, " ")}
                </span>
                {entry.details?.reason && (
                  <span className="text-slate-600 ml-1">
                    &mdash; &ldquo;{entry.details.reason}&rdquo;
                  </span>
                )}
                {entry.details?.notes && (
                  <span className="text-slate-600 ml-1">
                    &mdash; &ldquo;{entry.details.notes}&rdquo;
                  </span>
                )}
                <p className="text-slate-400 mt-0.5">
                  {new Date(entry.created_at).toLocaleDateString()} at{" "}
                  {new Date(entry.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
      )}
    </div>
  );
}
