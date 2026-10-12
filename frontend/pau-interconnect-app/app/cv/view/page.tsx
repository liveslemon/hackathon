"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Typography, Button } from "@/components/ui";
import { Loader2, AlertCircle } from "lucide-react";

function CVViewerContent() {
  const searchParams = useSearchParams();
  const rawUrl = searchParams ? searchParams.get("url") : null;
  const name = searchParams
    ? searchParams.get("name") || "Student CV"
    : "Student CV";

  const urlValidation = (() => {
    if (!rawUrl) return { valid: false, error: "Invalid CV link provided." };
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return { valid: false, error: "Invalid CV link protocol." };
      }
      return { valid: true, error: null };
    } catch {
      return { valid: false, error: "Malformed CV link provided." };
    }
  })();

  const [isLoading, setIsLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    document.title = name;

    if (!urlValidation.valid || !rawUrl) {
      return;
    }

    let objectUrl: string | null = null;
    fetch(rawUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch CV document");
        return res.blob();
      })
      .then((blob) => {
        const pdfBlob = new Blob([blob], { type: "application/pdf" });
        objectUrl = URL.createObjectURL(pdfBlob);
        setBlobUrl(objectUrl);
        setIsLoading(false);
      })
      .catch(() => {
        setFetchError("Failed to load CV. The secure link may have expired.");
        setIsLoading(false);
      });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [name, rawUrl, urlValidation.valid]);

  if (!urlValidation.valid || fetchError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-surface rounded-2xl border border-border p-8 text-center shadow-xs">
          <AlertCircle className="w-10 h-10 text-danger-fg mx-auto mb-3" />
          <Typography variant="h5" weight="bold" className="text-fg mb-2">
            Unable to Display CV
          </Typography>
          <Typography variant="body2" className="text-fg-muted mb-6">
            {fetchError || urlValidation.error}
          </Typography>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="w-full"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-background">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-brand mx-auto" />
            <Typography variant="body2" weight="medium" className="text-fg-muted">
              Securely loading {name}…
            </Typography>
          </div>
        </div>
      )}
      {blobUrl && (
        <iframe
          src={`${blobUrl}#view=FitH`}
          className="w-full h-full border-none"
          title={`${name} PDF Viewer`}
        />
      )}
    </div>
  );
}

export default function CVViewer() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
        </div>
      }
    >
      <CVViewerContent />
    </Suspense>
  );
}
