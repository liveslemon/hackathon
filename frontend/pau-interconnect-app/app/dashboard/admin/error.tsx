"use client";

import React, { useEffect } from "react";
import { Button, Typography, Stack } from "@/components/ui";

export default function AdminDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin dashboard error:", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="min-h-[50vh] flex items-center justify-center p-6 text-center"
    >
      <div className="max-w-md w-full bg-surface rounded-3xl p-8 shadow-xl border border-border">
        <Typography variant="h4" weight="bold" className="mb-3">
          Admin Portal Error
        </Typography>
        <Typography variant="body2" color="muted" className="mb-6">
          {error.message || "Failed to load administration view."}
        </Typography>
        <Stack spacing={3}>
          <Button onClick={reset} className="w-full">
            Retry
          </Button>
        </Stack>
      </div>
    </div>
  );
}
