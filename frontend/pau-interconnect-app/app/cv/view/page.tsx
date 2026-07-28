"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Typography } from "@/components/ui";

function CVViewerContent() {
  const searchParams = useSearchParams();
  const url = searchParams ? searchParams.get("url") : null;
  const name = searchParams
    ? searchParams.get("name") || "Student CV"
    : "Student CV";

  const [isLoading, setIsLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = name;

    if (!url) return;

    // Fetch PDF as blob to bypass Content-Disposition: attachment headers
    let objectUrl: string | null = null;
    fetch(url)
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
        setError("Failed to load CV. The link may have expired.");
        setIsLoading(false);
      });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [name, url]);

  if (!url) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Typography variant="h6" color="muted">
          Invalid CV Link Provided
        </Typography>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Typography variant="h6" className="text-red-600 font-bold">
          {error}
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
