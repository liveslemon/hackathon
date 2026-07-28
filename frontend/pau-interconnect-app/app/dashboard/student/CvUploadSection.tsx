"use client";
import { useState } from "react";
import { Typography, Stack } from "@/components/ui";
import { Button } from "@/components/ui";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type CvStatus = "idle" | "uploading" | "processing" | "complete" | "failed";

type UploadedFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  progress: number;
};

function simulateUploadProgress(onProgress: (progress: number) => void) {
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 8) + 5;
    if (progress > 100) progress = 100;
    onProgress(progress);
    if (progress >= 100) clearInterval(interval);
  }, 25);
}

export default function CvUploadSection() {
  const [status, setStatus] = useState<CvStatus>("idle");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const handleDropFiles = (files: FileList) => {
    const pdf = Array.from(files).find(
      (f) => f.type === "application/pdf" && f.size <= 5 * 1024 * 1024,
    );
    if (!pdf) {
      setErrorMessage("Please upload a PDF file under 5MB.");
      return;
    }
    const id = Math.random().toString();
    setUploadedFiles([
      { id, name: pdf.name, type: pdf.type, size: pdf.size, progress: 0 },
    ]);
    setSelectedFile(pdf);
    setStatus("idle");
    setErrorMessage("");
    simulateUploadProgress((progress) => {
      setUploadedFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, progress } : f)),
      );
    });
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setStatus("uploading");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      setStatus("processing");
      const res = await fetch("/api/cv/upload", {
        method: "POST",
        body: formData,
      });

      const payload: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        const message =
          (payload as { message?: string })?.message ??
          "CV analysis failed. Please try again.";
        setStatus("failed");
        setErrorMessage(message);
        return;
      }

      setStatus("complete");
    } catch {
      setStatus("failed");
      setErrorMessage("Network error. Please check your connection and retry.");
    }
  };

  const handleReset = () => {
    setUploadedFiles([]);
    setSelectedFile(null);
    setStatus("idle");
    setErrorMessage("");
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-violet-500" />
        </div>
        <div>
          <Typography variant="h6" weight="bold" className="text-slate-800">
            CV Analysis
          </Typography>
          <Typography variant="caption" className="text-slate-400">
            Upload your CV for personalized internship matching and career
            insights
          </Typography>
        </div>
      </div>

      {status === "complete" ? (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <Typography variant="body2" className="text-emerald-700">
              CV analyzed successfully. Your career metrics and internship
              matches have been updated.
            </Typography>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Upload new CV
          </Button>
        </div>
      ) : (
        <Stack spacing={4}>
          {uploadedFiles.length === 0 ? (
            <FileUpload.Root>
              <FileUpload.DropZone
                onDropFiles={handleDropFiles}
                accept="application/pdf"
                maxSize={5 * 1024 * 1024}
                hint="PDF only, up to 5MB"
              />
            </FileUpload.Root>
          ) : (
            <>
              <FileUpload.Root>
                <FileUpload.List>
                  {uploadedFiles.map((f) => (
                    <FileUpload.ListItemProgressBar
                      key={f.id}
                      {...f}
                      size={f.size}
                      onDelete={handleReset}
                    />
                  ))}
                </FileUpload.List>
              </FileUpload.Root>

              {status === "idle" && (
                <Button
                  onClick={handleAnalyze}
                  className="w-fit"
                  disabled={!selectedFile}
                >
                  Analyze CV
                </Button>
              )}

              {(status === "uploading" || status === "processing") && (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <Typography variant="body2">
                    {status === "uploading"
                      ? "Uploading..."
                      : "Analyzing your CV..."}
                  </Typography>
                </div>
              )}
            </>
          )}

          {status === "failed" && (
            <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-100 p-4">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <Typography variant="body2" className="text-red-700">
                  {errorMessage}
                </Typography>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Try again
              </Button>
            </div>
          )}
        </Stack>
      )}
    </div>
  );
}
