"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Typography,
  Stack,
  Container,
} from "@/components/ui";
import { AiOutlineArrowLeft, AiOutlineArrowRight } from "react-icons/ai";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { authenticatedFetch } from "@/lib/api";

// --- Data ---
const courses = [
  "Computer Science",
  "Engineering",
  "Business Administration",
  "Economics",
  "Biology",
  "Chemistry",
  "Physics",
  "Mathematics",
  "Design",
  "Marketing",
];
const levels = ["200", "300", "400", "500"];
const interests = [
  "Software Development",
  "Data Science",
  "Engineering",
  "Business",
  "Consulting",
  "Finance",
  "Design",
  "Marketing",
  "Research",
  "Healthcare",
];

type UploadedFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  progress: number;
  failed?: boolean;
  fileObject?: File;
};

// --- Simulate Upload Progress ---
function simulateUploadProgress(
  file: File,
  onProgress: (progress: number) => void,
) {
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 8) + 5;
    if (progress > 100) progress = 100;
    onProgress(progress);
    if (progress >= 100) clearInterval(interval);
  }, 25);
}

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    password: string;
    course: string;
    level: string;
    interests: string[];
    cvFile: File | null;
    cvUrl?: string | null;
  }>({
    name: "",
    email: "",
    password: "",
    course: "",
    level: "",
    interests: [],
    cvFile: null,
    cvUrl: null,
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "success" | "error" | "warning" | "info",
  });
  const router = useRouter();

  // --- Step 1: Personal Info ---
  function handleInputChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  // --- Step 2: Course ---
  function handleCourseSelect(course: string) {
    setFormData((prev) => ({ ...prev, course }));
  }

  // --- Step 3: Level ---
  function handleLevelSelect(level: string) {
    setFormData((prev) => ({ ...prev, level }));
  }

  // --- Step 4: Interests ---
  function handleInterestToggle(interest: string) {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  }

  // --- Step 4: CV Upload ---
  function handleDropFiles(files: FileList) {
    const arr = Array.from(files);
    const pdf = arr.find(
      (file) =>
        (file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf")) &&
        file.size <= 5 * 1024 * 1024,
    );
    if (!pdf) {
      setSnackbar({
        open: true,
        message: "Please upload a PDF file under 5MB.",
        severity: "error",
      });
      return;
    }
    const id = Math.random().toString();
    const up: UploadedFile = {
      id,
      name: pdf.name,
      type: pdf.type,
      size: pdf.size,
      progress: 0,
      fileObject: pdf,
    };
    setUploadedFiles([up]);
    setFormData((prev) => ({ ...prev, cvFile: pdf }));
    simulateUploadProgress(pdf, (progress) => {
      setUploadedFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, progress, failed: false } : f)),
      );
    });
  }

  function handleDeleteFile(id: string) {
    setUploadedFiles([]);
    setFormData((prev) => ({ ...prev, cvFile: null }));
  }

  function handleRetryFile(id: string) {
    const file = uploadedFiles.find((f) => f.id === id && f.fileObject);
    if (!file || !file.fileObject) return;
    simulateUploadProgress(file.fileObject, (progress) => {
      setUploadedFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, progress, failed: false } : f)),
      );
    });
  }

  // --- Step 5: Submit ---
  async function handleSubmit() {
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      formData.password.length < 6
    ) {
      setSnackbar({
        open: true,
        message: "Please complete all required fields (password >= 6 chars).",
        severity: "error",
      });
      return;
    }
    if (!formData.course) {
      setSnackbar({
        open: true,
        message: "Please select your course.",
        severity: "error",
      });
      return;
    }
    if (!formData.level) {
      setSnackbar({
        open: true,
        message: "Please select your level.",
        severity: "error",
      });
      return;
    }
    if (formData.interests.length === 0) {
      setSnackbar({
        open: true,
        message: "Please choose at least one interest.",
        severity: "error",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (authError) {
        setSnackbar({
          open: true,
          message: authError.message,
          severity: "error",
        });
        setIsSubmitting(false);
        return;
      }
      const user_id = authData?.user?.id;
      if (!user_id) {
        throw new Error("User ID not returned from signup");
      }

      const { error: profileInsertError } = await supabase
        .from("profiles")
        .insert({
          id: user_id,
          full_name: formData.name,
          course: formData.course,
          level: formData.level,
          interests: formData.interests,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileInsertError) {
        console.error("Failed to create profile row:", profileInsertError);
        setSnackbar({
          open: true,
          message: "Failed to initialize profile. Please try again.",
          severity: "error",
        });
        setIsSubmitting(false);
        return;
      }
      let cvUrl: string | null = null;

      if (formData.cvFile && user_id) {
        const backendFormData = new FormData();
        backendFormData.append("user_id", user_id);
        backendFormData.append("file", formData.cvFile);

        try {
          const result = await authenticatedFetch("/upload-and-analyze", {
            method: "POST",
            body: backendFormData,
          });

          cvUrl = result?.cv_url ?? null;
        } catch (err: any) {
          console.error("Backend CV upload failed:", err);
          setSnackbar({
            open: true,
            message:
              "CV uploaded but analysis failed. You can retry later from dashboard.",
            severity: "warning",
          });
        }
      }

      const pendingProfile = {
        full_name: formData.name,
        course: formData.course,
        level: formData.level,
        interests: formData.interests,
        cv_url: cvUrl,
      };
      try {
        localStorage.setItem("pendingProfile", JSON.stringify(pendingProfile));
      } catch (e) {
        console.warn("Could not write pendingProfile to localStorage", e);
      }
      setSnackbar({
        open: true,
        message: "Sign up successful! Please check your email.",
        severity: "success",
      });
      setStep(5);
    } catch (error: any) {
      console.error("Unexpected error during onboarding submit:", error);
      setSnackbar({
        open: true,
        message: "An unexpected error occurred. Please try again.",
        severity: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCloseSnackbar() {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center p-6 overflow-y-auto">
      <Container className="max-w-3xl w-full">
        <Card className="p-8 md:p-12 overflow-hidden shadow-2xl transition-all duration-500">
          <div className="mb-10">
            <Typography variant="h2" weight="bold" className="mb-3 text-slate-800">
              {step === 1 && "Personal Information"}
              {step === 2 && "Academic Details"}
              {step === 3 && "Select Your Level"}
              {step === 4 && "Career Interests & CV"}
              {step === 5 && "Email Confirmation"}
            </Typography>
            <div className="flex justify-between items-center mb-6">
              <Typography variant="body2" color="muted">
                Step {step} of 5
              </Typography>
              <Typography variant="caption" weight="bold" color="secondary">
                {Math.round((step / 5) * 100)}% Complete
              </Typography>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-gradient-to-r from-[#667eea] to-[#764ba2] transition-all duration-700 ease-out"
                 style={{ width: `${(step / 5) * 100}%` }}
               />
            </div>
          </div>

          <div className="min-h-[320px] transition-all duration-300">
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <Stack spacing={6}>
                <Input
                  label="Full Name *"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  disabled={isSubmitting}
                />
                <Input
                  label="PAU Email *"
                  type="email"
                  placeholder="john.doe@pau.edu.ng"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  disabled={isSubmitting}
                />
                <Input
                  label="Password *"
                  type="password"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  disabled={isSubmitting}
                />
              </Stack>
            )}

            {/* Step 2: Course */}
            {step === 2 && (
              <div>
                <Typography variant="h6" weight="bold" className="mb-6 text-slate-700">Select Your Course *</Typography>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {courses.map((course) => (
                    <Button
                      key={course}
                      variant={formData.course === course ? "solid" : "outline"}
                      onClick={() => handleCourseSelect(course)}
                      disabled={isSubmitting}
                      className="justify-start px-6 h-14"
                    >
                      {course}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Level */}
            {step === 3 && (
              <div>
                <Typography variant="h6" weight="bold" className="mb-6 text-slate-700">Select Your Level *</Typography>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {levels.map((lvl) => (
                    <Button
                      key={lvl}
                      variant={formData.level === lvl ? "solid" : "outline"}
                      onClick={() => handleLevelSelect(lvl)}
                      disabled={isSubmitting}
                      className="h-20 text-xl"
                    >
                      {lvl}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Interests and CV */}
            {step === 4 && (
              <Stack spacing={10}>
                <div>
                  <Typography variant="h6" weight="bold" className="mb-6 text-slate-700">Career Interests *</Typography>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {interests.map((interest) => (
                      <Button
                        key={interest}
                        variant={formData.interests.includes(interest) ? "solid" : "outline"}
                        size="sm"
                        onClick={() => handleInterestToggle(interest)}
                        disabled={isSubmitting}
                        className="text-xs py-3"
                      >
                        {interest}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Typography variant="h6" weight="bold" className="mb-4 text-slate-700">Upload CV/Resume (Optional)</Typography>
                  <FileUpload.Root>
                    {uploadedFiles.length === 0 && (
                      <FileUpload.DropZone
                        isDisabled={isSubmitting}
                        onDropFiles={handleDropFiles}
                        accept="application/pdf"
                      />
                    )}
                    <FileUpload.List>
                      {uploadedFiles.map((file) => (
                        <FileUpload.ListItemProgressBar
                          key={file.id}
                          {...file}
                          size={file.size}
                          onDelete={() => handleDeleteFile(file.id)}
                          onRetry={() => handleRetryFile(file.id)}
                        />
                      ))}
                    </FileUpload.List>
                  </FileUpload.Root>
                  <Typography variant="caption" color="muted" className="mt-4 block italic">
                    PDF files only, max 5MB
                  </Typography>
                </div>
              </Stack>
            )}

            {/* Step 5: Email Confirmation */}
            {step === 5 && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                   <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                   </svg>
                </div>
                <Typography variant="h3" className="mb-4">Check your email!</Typography>
                <Typography variant="body1" color="muted" className="mb-10 max-w-sm mx-auto">
                  We've sent a verification link to <span className="text-slate-900 font-bold">{formData.email}</span>. Click it to activate your account.
                </Typography>
                
                <Stack direction="col" spacing={3}>
                  <Button
                    onClick={async () => {
                      try {
                        const { error } = await supabase.auth.signInWithOtp({
                          email: formData.email,
                        });
                        if (error) throw error;
                        setSnackbar({ open: true, message: "Verification email resent.", severity: "success" });
                      } catch (e: any) {
                        setSnackbar({ open: true, message: `Failed: ${e.message}`, severity: "error" });
                      }
                    }}
                    disabled={isSubmitting}
                    variant="outline"
                  >
                    Resend verification email
                  </Button>
                  <Button
                    variant="ghost"
                    colorType="secondary"
                    onClick={() => router.push("/login/student")}
                  >
                    Go to sign in 
                  </Button>
                </Stack>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-12 pt-8 border-t border-slate-100">
            {step > 1 && step < 5 && (
              <Button
                variant="ghost"
                leftIcon={<AiOutlineArrowLeft />}
                onClick={() => setStep(step - 1)}
                disabled={isSubmitting}
              >
                Back
              </Button>
            )}
            <div className="ml-auto flex gap-4">
               {step < 4 && (
                 <Button
                   rightIcon={<AiOutlineArrowRight />}
                   onClick={() => setStep(step + 1)}
                   className="min-w-[120px]"
                   disabled={
                     isSubmitting ||
                     (step === 1 && (!formData.name.trim() || !formData.email.trim() || formData.password.length < 6)) ||
                     (step === 2 && !formData.course) ||
                     (step === 3 && !formData.level)
                   }
                 >
                   Next
                 </Button>
               )}
               {step === 4 && (
                 <Button
                   onClick={handleSubmit}
                   className="min-w-[160px]"
                   isLoading={isSubmitting}
                   disabled={
                     isSubmitting ||
                     formData.interests.length === 0 ||
                     (uploadedFiles.length > 0 && uploadedFiles.some((f) => f.progress < 100))
                   }
                 >
                   {isSubmitting ? "Creating Account..." : "Complete Setup"}
                 </Button>
               )}
            </div>
          </div>
        </Card>

        {/* Custom Snackbar/Toast */}
        {snackbar.open && (
          <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-300 z-[100] border ${
            snackbar.severity === "success" 
              ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
              : "bg-red-50 text-red-700 border-red-100"
          }`}>
             <div className="flex items-center gap-3">
               <Typography variant="body2" weight="bold">{snackbar.message}</Typography>
               <button onClick={handleCloseSnackbar} className="ml-4 hover:opacity-100 opacity-50 transition-opacity">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
               </button>
             </div>
          </div>
        )}
      </Container>
    </div>
  );
}
