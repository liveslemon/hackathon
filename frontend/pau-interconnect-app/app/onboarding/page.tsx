// "use client" directive for Next.js App Router
"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Grid,
  LinearProgress,
  Stack,
  Snackbar,
  Alert,
  CircularProgress,
  Card,
} from "@mui/material";
import { AiOutlineArrowLeft, AiOutlineArrowRight } from "react-icons/ai";
import { FileUpload } from "@/components/application/file-upload/file-upload-base";

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
    // Only PDF, max 5MB
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
    // Console verify before submit
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
    // If CV file exists, validate again
    if (formData.cvFile) {
      if (
        formData.cvFile.type !== "application/pdf" &&
        !formData.cvFile.name.toLowerCase().endsWith(".pdf")
      ) {
        setSnackbar({
          open: true,
          message: "CV must be a PDF file.",
          severity: "error",
        });
        return;
      }
      if (formData.cvFile.size > 5 * 1024 * 1024) {
        setSnackbar({
          open: true,
          message: "CV file is too large. Max 5MB.",
          severity: "error",
        });
        return;
      }
    }
    setIsSubmitting(true);
    try {
      // 1. Sign up user
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

      // Create profile row immediately so backend validation passes
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

      // 2. Send CV to backend for upload + extraction + analysis
      if (formData.cvFile && user_id) {
        const backendFormData = new FormData();
        backendFormData.append("user_id", user_id);
        backendFormData.append("file", formData.cvFile);

        try {
          const response = await fetch(
            "http://localhost:8000/upload-and-analyze",
            {
              method: "POST",
              body: backendFormData,
            },
          );

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result?.error || "Backend upload failed");
          }

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
      // 3. Log user_id and file info
      console.log("User ID:", user_id);
      console.log("Backend CV processing result:", {
        url: cvUrl,
        size: formData.cvFile?.size,
      });
      // 4. Store pendingProfile in localStorage
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
        // eslint-disable-next-line no-console
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

  // --- UI ---
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: "primary.main",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        px: { xs: 2, sm: 4 },
        overflowY: "auto",
      }}
    >
      <Container
        sx={{
          py: { xs: 6, sm: 8, md: 10 },
          px: { xs: 2, sm: 4, md: 6 },
          maxWidth: { xs: "100%", sm: "600px", md: "700px", lg: "800px" },
          borderRadius: 3,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          backgroundColor: "#fff",
        }}
      >
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h2" gutterBottom>
            {step === 1 && "Personal Information"}
            {step === 2 && "Academic Details"}
            {step === 3 && "Select Your Level"}
            {step === 4 && "Career Interests & CV"}
            {step === 5 && "Email Confirmation"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Step {step} of 5
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(step / 5) * 100}
            sx={{ mt: 2, height: 10, borderRadius: 5 }}
          />
        </Box>

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <Stack spacing={3}>
            <TextField
              label="Full Name *"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              fullWidth
              disabled={isSubmitting}
            />
            <TextField
              label="PAU Email *"
              type="email"
              placeholder="john.doe@pau.edu.ng"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              fullWidth
              disabled={isSubmitting}
            />
            <TextField
              label="Password *"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              fullWidth
              disabled={isSubmitting}
              inputProps={{ minLength: 6 }}
            />
          </Stack>
        )}

        {/* Step 2: Course */}
        {step === 2 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Select Your Course *
            </Typography>
            <Grid container spacing={2}>
              {courses.map((course) => (
                <Grid item xs={6} key={course}>
                  <Button
                    variant={
                      formData.course === course ? "contained" : "outlined"
                    }
                    fullWidth
                    onClick={() => handleCourseSelect(course)}
                    disabled={isSubmitting}
                  >
                    {course}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Step 3: Level */}
        {step === 3 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Select Your Level *
            </Typography>
            <Grid container spacing={2}>
              {levels.map((lvl) => (
                <Grid item xs={6} sm={3} key={lvl}>
                  <Button
                    variant={formData.level === lvl ? "contained" : "outlined"}
                    fullWidth
                    onClick={() => handleLevelSelect(lvl)}
                    disabled={isSubmitting}
                  >
                    {lvl}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Step 4: Interests and CV */}
        {step === 4 && (
          <Stack spacing={4}>
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Select Your Interests * (Choose at least one)
              </Typography>
              <Grid container spacing={2}>
                {interests.map((interest) => (
                  <Grid item xs={6} key={interest}>
                    <Button
                      variant={
                        formData.interests.includes(interest)
                          ? "contained"
                          : "outlined"
                      }
                      fullWidth
                      onClick={() => handleInterestToggle(interest)}
                      disabled={isSubmitting}
                    >
                      {interest}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Box>
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                Upload CV/Resume (Optional)
              </Typography>
              <FileUpload.Root>
                {uploadedFiles.length === 0 && (
                  <FileUpload.DropZone
                    isDisabled={isSubmitting}
                    onDropFiles={handleDropFiles}
                    accept="application/pdf"
                  />
                )}
                {uploadedFiles.length === 0 && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 1 }}
                  >
                    Format: PDF only (Max 5MB)
                  </Typography>
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
            </Box>
          </Stack>
        )}

        {/* Step 5: Email Confirmation */}
        {step === 5 && (
          <Card sx={{ p: 4, mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Check your email to confirm your account
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              We have sent a confirmation link to{" "}
              <strong>{formData.email}</strong>. Click the link to finish
              setting up your account.
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={async () => {
                  try {
                    const { error } = await supabase.auth.signInWithOtp({
                      email: formData.email,
                    });
                    if (error) throw error;
                    setSnackbar({
                      open: true,
                      message: "Verification email resent.",
                      severity: "success",
                    });
                  } catch (e: any) {
                    setSnackbar({
                      open: true,
                      message: `Failed to resend: ${e.message}`,
                      severity: "error",
                    });
                  }
                }}
                disabled={isSubmitting}
              >
                Resend verification email
              </Button>
              <Button
                variant="outlined"
                onClick={() => router.push("/login/student")}
                disabled={isSubmitting}
              >
                Go to sign in
              </Button>
            </Stack>
          </Card>
        )}

        {/* Navigation Buttons */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
          {step > 1 && step < 5 && (
            <Button
              variant="outlined"
              startIcon={<AiOutlineArrowLeft />}
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting}
            >
              Back
            </Button>
          )}
          {step < 4 && (
            <Button
              variant="contained"
              endIcon={<AiOutlineArrowRight />}
              onClick={() => setStep(step + 1)}
              disabled={
                isSubmitting ||
                (step === 1 &&
                  (!formData.name.trim() ||
                    !formData.email.trim() ||
                    formData.password.length < 6)) ||
                (step === 2 && !formData.course) ||
                (step === 3 && !formData.level)
              }
              sx={{ ml: "auto" }}
            >
              Next
            </Button>
          )}
          {step === 4 && (
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                formData.interests.length === 0 ||
                (uploadedFiles.length > 0 &&
                  uploadedFiles.some((f) => f.progress < 100))
              }
              startIcon={
                isSubmitting ? (
                  <CircularProgress size={20} color="inherit" />
                ) : null
              }
            >
              {isSubmitting ? "Processing..." : "Complete Setup"}
            </Button>
          )}
        </Box>

        {/* Snackbar Alerts */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}
