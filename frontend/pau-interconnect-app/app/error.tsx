"use client";

import React, { useEffect } from "react";
import { Button, Typography, Stack } from "@/components/ui";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Root error boundary caught error:", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-center"
    >
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[32px] p-8 md:p-10 shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-rose-50 dark:bg-rose-950/40 rounded-full flex items-center justify-center text-rose-500 dark:text-rose-400 mx-auto mb-8">
          <svg
            className="w-10 h-10"
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

        <Typography variant="h3" weight="bold" className="mb-4">
          Something went wrong
        </Typography>

        <Typography variant="body2" color="muted" className="mb-8">
          {error.message || "An unexpected error occurred while loading this page."}
        </Typography>

        <Stack spacing={3}>
          <Button onClick={reset} className="w-full h-12 md:h-14 rounded-2xl shadow-lg shadow-indigo-500/10">
            Try Again
          </Button>
          <Button
            variant="ghost"
            onClick={() => (window.location.href = "/")}
            className="w-full h-12 md:h-14 rounded-2xl"
          >
            Back to Home
          </Button>
        </Stack>
      </div>
    </div>
  );
}
