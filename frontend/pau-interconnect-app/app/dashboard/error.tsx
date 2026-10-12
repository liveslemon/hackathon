"use client";

import React, { useEffect } from "react";
import { Button, Typography, Stack } from "@/components/ui";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="min-h-[60vh] flex items-center justify-center p-6 text-center"
    >
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-800">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 rounded-full flex items-center justify-center text-rose-500 dark:text-rose-400 mx-auto mb-6">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <Typography variant="h4" weight="bold" className="mb-3">
          Dashboard Encountered an Error
        </Typography>

        <Typography variant="body2" color="muted" className="mb-6">
          {error.message || "Unable to display this dashboard section right now."}
        </Typography>

        <Stack spacing={3}>
          <Button onClick={reset} className="w-full h-12 rounded-xl">
            Retry
          </Button>
          <Button
            variant="ghost"
            onClick={() => (window.location.href = "/dashboard")}
            className="w-full h-12 rounded-xl"
          >
            Go to Dashboard Home
          </Button>
        </Stack>
      </div>
    </div>
  );
}
