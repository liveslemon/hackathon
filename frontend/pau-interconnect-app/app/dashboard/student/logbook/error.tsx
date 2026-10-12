"use client";

import React from "react";
import { Button, Typography, Stack } from "@/components/ui";

export default function LogbookError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="min-h-[40vh] flex items-center justify-center p-6 text-center"
    >
      <div className="max-w-md w-full bg-surface rounded-2xl p-8 shadow-xs border border-border">
        <Typography variant="h4" weight="bold" className="mb-2 text-fg">
          Logbook Error
        </Typography>
        <Typography variant="body2" className="text-fg-muted mb-6">
          {error.message || "Failed to load SIWES logbook entries."}
        </Typography>
        <Stack spacing={3}>
          <Button onClick={reset} colorType="primary" className="w-full">
            Retry
          </Button>
        </Stack>
      </div>
    </div>
  );
}
