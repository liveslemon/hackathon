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
      <div className="max-w-md w-full bg-surface rounded-2xl p-8 shadow-xs border border-border">
        <Typography variant="h4" weight="bold" className="mb-2 text-fg">
          Internship Details Unavailable
        </Typography>
        <Typography variant="body2" className="text-fg-muted mb-6">
          {error.message || "This internship listing could not be loaded."}
        </Typography>
        <Stack spacing={3}>
          <Button onClick={reset} colorType="primary" className="w-full">
            Retry
          </Button>
          <Button
            variant="ghost"
            onClick={() => (window.location.href = "/dashboard/student")}
            className="w-full text-fg-muted hover:text-fg"
          >
            Browse Internships
          </Button>
        </Stack>
      </div>
    </div>
  );
}
