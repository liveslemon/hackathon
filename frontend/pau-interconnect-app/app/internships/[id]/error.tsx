"use client";

import React from "react";
import { Button, Typography, Stack } from "@/components/ui";

export default function InternshipError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="min-h-[50vh] flex items-center justify-center p-6 text-center"
    >
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-100 dark:border-slate-800">
        <Typography variant="h4" weight="bold" className="mb-3">
          Internship Details Unavailable
        </Typography>
        <Typography variant="body2" color="muted" className="mb-6">
          {error.message || "This internship listing could not be loaded."}
        </Typography>
        <Stack spacing={3}>
          <Button onClick={reset} className="w-full">
            Retry
          </Button>
          <Button
            variant="ghost"
            onClick={() => (window.location.href = "/dashboard/student")}
            className="w-full"
          >
            Browse Internships
          </Button>
        </Stack>
      </div>
    </div>
  );
}
