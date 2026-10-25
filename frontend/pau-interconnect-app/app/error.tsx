"use client";

import React, { useEffect } from "react";
import { Button, Typography, Stack } from "@/components/ui";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

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
      className="min-h-screen bg-background text-fg flex items-center justify-center p-6 text-center"
    >
      <div className="max-w-md w-full bg-surface rounded-3xl p-8 md:p-10 shadow-2xl border border-border animate-in fade-in zoom-in duration-300">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-danger-subtle rounded-3xl flex items-center justify-center text-danger mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 md:w-10 md:h-10" />
        </div>

        <Typography variant="h3" weight="bold" className="mb-3">
          Something went wrong
        </Typography>

        <Typography variant="body2" color="muted" className="mb-8 leading-relaxed">
          {error.message || "An unexpected error occurred while loading this page."}
        </Typography>

        <Stack spacing={3}>
          <Button
            onClick={reset}
            className="w-full h-12 rounded-2xl shadow-sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
            className="w-full h-12 rounded-2xl"
            leftIcon={<Home className="w-4 h-4" />}
          >
            Back to Home
          </Button>
        </Stack>
      </div>
    </div>
  );
}
