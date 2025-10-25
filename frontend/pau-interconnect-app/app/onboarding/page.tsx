"use client";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
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
  Paper,
} from "@mui/material";
import { AiOutlineArrowLeft, AiOutlineArrowRight } from "react-icons/ai";

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

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [isValid, setIsValid] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    course: "",
    level: "",
    interests: [] as string[],
    cvFile: null as File | null,
  });

  const [cvAnalysis, setCvAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "success" | "error" | "warning" | "info",
  });

  const router = useRouter();

  const handleInterestToggle = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFormData((prev) => ({
        ...prev,
        cvFile: event.target.files![0],
      }));
      setCvAnalysis(null); // Reset analysis when new file uploaded
    }
  };

const analyzeCV = async () => {
  if (!formData.cvFile) {
    setCvAnalysis("Please upload a CV file before analysis.");
    return;
  }
  if (!formData.name.trim()) {
    setCvAnalysis("Please enter your full name before analysis.");
    return;
  }
  if (!formData.email.trim()) {
    setCvAnalysis("Please enter your email before analysis.");
    return;
  }

  setIsAnalyzing(true);
  setCvAnalysis(null);

  try {
    const formPayload = new FormData();
    formPayload.append("file", formData.cvFile);               // Must match FastAPI field
    formPayload.append("name", formData.name);
    formPayload.append("email", formData.email);
    formPayload.append(
      "internships",
      JSON.stringify([
        { title: "Data Analyst Intern", skills: "Python, SQL", description: "Analyze data" },
        { title: "Frontend Intern", skills: "React, CSS", description: "Build UI" },
      ])
    );

    const response = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      body: formPayload,
    });

    const data = await response.json();
    console.log("Backend response:", data);

    if (!response.ok) {
      const errorMsg = data.error || "Failed to analyze CV";
      setCvAnalysis(`Error: ${errorMsg}`);
      return;
    }

    if (data.analysis) {
      setCvAnalysis(data.analysis);

      // Save structured CV analysis to Supabase
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            cv_url: formData.cvFile ? formData.cvFile.name : null,
            cv_analysis: data.analysis,
          })
          .eq("id", user.id);

        if (updateError) {
          console.error("Error updating CV analysis in Supabase:", updateError);
          setSnackbar({
            open: true,
            message: `Failed to save CV analysis: ${updateError.message}`,
            severity: "error",
          });
        }
      }
    } else {
      setCvAnalysis("No analysis returned from the backend.");
    }
  } catch (error: any) {
    console.error("Error during CV analysis:", error);
    setCvAnalysis(`An error occurred: ${error.message || error.toString()}`);
  } finally {
    setIsAnalyzing(false);
  }
};

  const handleSubmit = async () => {
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
      return;
    }

    const userId = authData.user?.id;

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      full_name: formData.name,
      course: formData.course,
      level: formData.level,
      interests: formData.interests,
      cv_url: formData.cvFile ? formData.cvFile.name : null,
    });

    if (profileError) {
      setSnackbar({
        open: true,
        message: `Profile not saved: ${profileError.message}`,
        severity: "error",
      });
      return;
    }

    setSnackbar({
      open: true,
      message:
        "Signup successful! Please check your email and click the confirmation link to continue.",
      severity: "success",
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
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
            {step === 4 && "Career Interests"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Step {step} of 4
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(step / 4) * 100}
            sx={{ mt: 2, height: 10, borderRadius: 5 }}
          />
        </Box>

        {step === 1 && (
          <Stack spacing={3}>
            <TextField
              label="Full Name *"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="PAU Email *"
              type="email"
              placeholder="john.doe@pau.edu.ng"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              fullWidth
            />
            <TextField
              label="Password *"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              fullWidth
            />
          </Stack>
        )}

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
                    onClick={() => setFormData({ ...formData, course })}
                  >
                    {course}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {step === 3 && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Select Your Level *
            </Typography>
            <Grid container spacing={2}>
              {[200, 300, 400, 500].map((lvl) => (
                <Grid item xs={6} sm={3} key={lvl}>
                  <Button
                    variant={formData.level === String(lvl) ? "contained" : "outlined"}
                    fullWidth
                    onClick={() => setFormData({ ...formData, level: String(lvl) })}
                  >
                    {lvl}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {step === 4 && (
          <Stack spacing={3}>
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
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                style={{ display: "none" }}
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <Button
                variant="outlined"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose File
              </Button>
              {formData.cvFile && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Selected file: {formData.cvFile.name}
                </Typography>
              )}
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  onClick={analyzeCV}
                  disabled={isAnalyzing || !formData.cvFile}
                  startIcon={
                    isAnalyzing ? <CircularProgress size={20} /> : null
                  }
                >
                  {isAnalyzing ? "Analyzing..." : "Analyze CV"}
                </Button>
              </Box>
              {cvAnalysis && (
                <Paper
                  elevation={3}
                  sx={{
                    mt: 3,
                    p: 2,
                    backgroundColor: "#f0f4f8",
                    whiteSpace: "pre-wrap",
                    maxHeight: 200,
                    overflowY: "auto",
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="subtitle1" gutterBottom>
                    CV Analysis:
                  </Typography>
                  <Typography variant="body2">{cvAnalysis}</Typography>
                </Paper>
              )}
            </Box>
          </Stack>
        )}

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4 }}>
          {step > 1 && (
            <Button
              variant="outlined"
              startIcon={<AiOutlineArrowLeft />}
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
          )}
          {step < 4 ? (
            <Button
              variant="contained"
              endIcon={<AiOutlineArrowRight />}
              onClick={() => setStep(step + 1)}
            >
              Next
            </Button>
          ) : (
            <Button variant="contained" color="primary" onClick={handleSubmit}>
              Complete Setup
            </Button>
          )}
        </Box>

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
};

export default Onboarding;
