"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  Button,
  Typography,
  Stack,
  Input,
} from "@/components/ui";
import { AiOutlineArrowLeft, AiOutlineArrowRight } from "react-icons/ai";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";
import { authenticatedFetch } from "@/lib/api";

// --- Data ---
const courses = ["Computer Science", "Engineering", "Business Administration", "Economics", "Biology", "Chemistry", "Physics", "Mathematics", "Design", "Marketing"];
const levels = ["200", "300", "400", "500"];
const interests = ["Software Development", "Data Science", "Engineering", "Business", "Consulting", "Finance", "Design", "Marketing", "Research", "Healthcare"];

type UploadedFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  progress: number;
  failed?: boolean;
  fileObject?: File;
};

function simulateUploadProgress(file: File, onProgress: (progress: number) => void) {
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 8) + 5;
    if (progress > 100) progress = 100;
    onProgress(progress);
    if (progress >= 100) clearInterval(interval);
  }, 25);
}

export default function OnboardingClient({ initialUser }: { initialUser: any }) {
  const [step, setStep] = useState(initialUser ? 2 : 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [optimisticMessage, setOptimisticMessage] = useState("");
  const [formData, setFormData] = useState({
    name: initialUser?.user_metadata?.full_name || initialUser?.user_metadata?.name || "",
    email: initialUser?.email || "",
    password: initialUser ? "PRE_AUTHENTICATED" : "",
    course: "",
    level: "",
    interests: [] as string[],
    cvFile: null as File | null,
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "success" | "error" | "warning" | "info",
  });
  const router = useRouter();

  const handleInputChange = (field: string, value: string) => setFormData((prev) => ({ ...prev, [field]: value }));
  const handleInterestToggle = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleDropFiles = (files: FileList) => {
    const pdf = Array.from(files).find(f => f.type === "application/pdf" && f.size <= 5 * 1024 * 1024);
    if (!pdf) {
      setSnackbar({ open: true, message: "Please upload a PDF file under 5MB.", severity: "error" });
      return;
    }
    const id = Math.random().toString();
    setUploadedFiles([{ id, name: pdf.name, type: pdf.type, size: pdf.size, progress: 0, fileObject: pdf }]);
    setFormData(prev => ({ ...prev, cvFile: pdf }));
    simulateUploadProgress(pdf, (progress) => {
      setUploadedFiles(prev => prev.map(f => f.id === id ? { ...f, progress } : f));
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setOptimisticMessage("Creating your profile...");
    try {
      let user_id = initialUser?.id;
      if (!user_id) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (authError) throw authError;
        user_id = authData?.user?.id;
      }

      const { error: profileError } = await supabase.from("profiles").insert({
        id: user_id,
        full_name: formData.name,
        course: formData.course,
        level: formData.level,
        interests: formData.interests,
        role: "student",
      });
      if (profileError) throw profileError;

      if (formData.cvFile) {
        setOptimisticMessage("Analyzing CV...");
        const bf = new FormData();
        bf.append("user_id", user_id!);
        bf.append("file", formData.cvFile);
        authenticatedFetch("/upload-and-analyze", { method: "POST", body: bf }).catch(console.error);
      }

      setStep(5);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message, severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl md:mx-6">
      <div className="px-6 py-8 md:p-12 md:bg-white md:rounded-3xl md:shadow-2xl">
        <div className="mb-10">
          <Typography variant="h2" weight="bold" className="mb-3">
             {step === 1 && "Personal Information"}
             {step === 2 && "Academic Details"}
             {step === 3 && "Select Your Level"}
             {step === 4 && "Career Interests & CV"}
             {step === 5 && "Complete!"}
          </Typography>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mt-4">
             <div className="h-full bg-brand transition-all duration-500" style={{ width: `${(step/5)*100}%` }} />
          </div>
        </div>

        <div className="min-h-[320px]">
          {step === 1 && (
            <Stack spacing={6}>
              <Input label="Name" value={formData.name} onChange={e => handleInputChange("name",e.target.value)} />
              <Input label="Email" value={formData.email} onChange={e => handleInputChange("email",e.target.value)} />
              <Input label="Password" type="password" value={formData.password} onChange={e => handleInputChange("password",e.target.value)} />
            </Stack>
          )}
          {step === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {courses.map(c => (
                <Button key={c} variant={formData.course === c ? "solid" : "outline"} onClick={() => setFormData({...formData, course: c})}>{c}</Button>
              ))}
            </div>
          )}
          {step === 3 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {levels.map(l => (
                <Button key={l} variant={formData.level === l ? "solid" : "outline"} className="h-20" onClick={() => setFormData({...formData, level: l})}>{l}</Button>
              ))}
            </div>
          )}
          {step === 4 && (
            <Stack spacing={8}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                 {interests.map(i => (
                   <Button key={i} size="sm" variant={formData.interests.includes(i) ? "solid" : "outline"} onClick={() => handleInterestToggle(i)}>{i}</Button>
                 ))}
              </div>
              <FileUpload.Root>
                 {uploadedFiles.length === 0 && <FileUpload.DropZone onDropFiles={handleDropFiles} accept="application/pdf" />}
                 <FileUpload.List>
                   {uploadedFiles.map(f => (
                     <FileUpload.ListItemProgressBar key={f.id} {...f} size={f.size} onDelete={() => {setUploadedFiles([]); setFormData({...formData, cvFile: null})}} />
                   ))}
                 </FileUpload.List>
              </FileUpload.Root>
            </Stack>
          )}
          {step === 5 && (
            <div className="text-center py-10">
               <Typography variant="h3">You're all set!</Typography>
               <Typography color="muted" className="mt-4">Check your email for verification. You can now proceed to the dashboard.</Typography>
               <Button className="mt-8" onClick={() => router.push("/dashboard/student")}>Go to Dashboard</Button>
            </div>
          )}
        </div>

        {step < 5 && (
          <div className="flex justify-between mt-12 pt-8 border-t border-slate-100">
             {step > 1 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}
             <div className="ml-auto">
                {step < 4 ? (
                  <Button onClick={() => setStep(step +1)} disabled={(step===1 && !formData.name) || (step===2 && !formData.course) || (step===3 && !formData.level)}>Next</Button>
                ) : (
                  <Button onClick={handleSubmit} isLoading={isSubmitting}>{isSubmitting ? optimisticMessage : "Complete Setup"}</Button>
                )}
             </div>
          </div>
        )}
      </div>

      {snackbar.open && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-red-50 text-red-700 px-6 py-3 rounded-xl border border-red-100 shadow-xl">
           {snackbar.message}
        </div>
      )}
    </div>
  );
}
