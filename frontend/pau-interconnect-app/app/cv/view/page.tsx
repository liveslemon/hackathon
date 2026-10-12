"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Typography } from "@/components/ui";

function CVViewerContent() {
  const searchParams = useSearchParams();
  const rawUrl = searchParams ? searchParams.get("url") : null;
  const name = searchParams
    ? searchParams.get("name") || "Student CV"
    : "Student CV";

  const urlValidation = (() => {
    if (!rawUrl) return { valid: false, error: "Invalid CV Link Provided" };
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return { valid: false, error: "Invalid CV URL protocol." };
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

    // Fetch PDF as blob to bypass Content-Disposition: attachment headers
    let objectUrl: string | null = null;
    fetch(rawUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch CV");
        return res.blob();
      })
      .then((blob) => {
        // Ensure it's treated as a PDF
        const pdfBlob = new Blob([blob], { type: "application/pdf" });
        objectUrl = URL.createObjectURL(pdfBlob);
        setBlobUrl(objectUrl);
        setIsLoading(false);
      })
      .catch(() => {
        setFetchError("Failed to load CV. The link may have expired.");
        setIsLoading(false);
      });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [name, rawUrl, urlValidation.valid]);

  if (!urlValidation.valid) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Typography variant="h6" className="text-red-600 font-bold">
          {urlValidation.error}
        </Typography>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Typography variant="h6" className="text-red-600 font-bold">
          {fetchError}
        </Typography>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#333]">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <Typography variant="body1" weight="semibold" color="muted">
              Securely loading {name}...
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
        <div className="flex h-screen items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      }
    >
      <CVViewerContent />
    </Suspense>
  );
}
