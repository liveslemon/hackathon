"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Typography } from "@/components/ui";

function CVViewerContent() {
  const searchParams = useSearchParams();
  const url = searchParams ? searchParams.get("url") : null;
  const name = searchParams ? (searchParams.get("name") || "Student CV") : "Student CV";

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set the document title cleanly to the student's name
    document.title = name;
    
    // Slight delay to allow iframe to initiate painting before removing loader
    if (url) {
      setTimeout(() => setIsLoading(false), 800);
    }
  }, [name, url]);

  if (!url) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Typography variant="h6" color="muted">Invalid CV Link Provided</Typography>
      </div>
    );
  }

  // We must strip any legacy '?download=' queries from the database URL, so Supabase doesn't force a download.
  let cleanUrl: string | null = url;
  try {
    const parsed = new URL(url);
    
    // SECURITY PATCH: Explicitly enforce that the URL is 
    // strictly targeting our Supabase database domain to prevent XSS iframe injections.
    if (!parsed.origin.includes("supabase.co") || parsed.protocol !== "https:") {
      console.warn("Security Alert: Blocked untrusted iframe URL injection.", url);
      cleanUrl = null;
    } else {
      parsed.searchParams.delete("download");
      cleanUrl = parsed.toString();
    }
  } catch (e) {
    cleanUrl = null;
  }

  // Double check if the security validation wiped the URL
  if (!cleanUrl) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Typography variant="h6" className="text-red-600 font-bold">Security Error: Untrusted URL Source Blocked</Typography>
      </div>
    );
  }

  // We append #view=FitH to the Supabase URL to force the browser's native PDF viewer to fill the width
  const viewerUrl = `${cleanUrl}#view=FitH`;

  return (
    <div className="w-screen h-screen overflow-hidden relative bg-[#333]">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <Typography variant="body1" weight="semibold" color="muted">Securely loading {name}...</Typography>
          </div>
        </div>
      )}
      <iframe 
        src={viewerUrl} 
        className="w-full h-full border-none" 
        title={`${name} PDF Viewer`}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
}

export default function CVViewer() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <CVViewerContent />
    </Suspense>
  );
}
