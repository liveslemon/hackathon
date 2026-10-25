"use client";

import React, { useEffect } from "react";
import { Button, Typography, Stack } from "@/components/ui";
import { AlertCircle, RefreshCw, LayoutDashboard } from "lucide-react";

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
      <div className="max-w-md w-full bg-surface rounded-3xl p-8 shadow-xl border border-border">
        <div className="w-16 h-16 bg-danger-subtle rounded-2xl flex items-center justify-center text-danger mx-auto mb-6">
          <AlertCircle className="w-8 h-8" />
        </div>

        <Typography variant="h4" weight="bold" className="mb-3">
          Dashboard Encountered an Error
        </Typography>

        <Typography variant="body2" color="muted" className="mb-6 leading-relaxed">
          {error.message || "Unable to display this dashboard section right now."}
        </Typography>

        <Stack spacing={3}>
          <Button
            onClick={reset}
            className="w-full h-12 rounded-xl"
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Retry Section
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/dashboard")}
            className="w-full h-12 rounded-xl"
            leftIcon={<LayoutDashboard className="w-4 h-4" />}
          >
            Go to Dashboard Home
          </Button>
        </Stack>
      </div>
    </div>
  );
}
