"use client";
import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
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
    interests: [] as string[],
    cvFile: null as File | null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "success" | "error" | "warning" | "info",
  });

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
    }
  };

  const handleSubmit = async () => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      setSnackbar({
        open: true,
        message: authError.message,
        severity: "error",
      });
      return;
    }

    // ✅ Sign the user in immediately (so auth.uid() is valid)
    await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    const userId = authData.user?.id;

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      full_name: formData.name,
      course: formData.course,
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
      message: "Profile successfully created!",
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
            {step === 3 && "Career Interests"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Step {step} of 3
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(step / 3) * 100}
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
          {step < 3 ? (
            <Button
              variant="contained"
              endIcon={<AiOutlineArrowRight />}
              onClick={() => setStep(step + 1)}
            >
              Next
            </Button>
          ) : (
            <>
              {!isValid && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSubmit}
                >
                  Complete Setup
                </Button>
              )}
              {isValid && (
                <Link href="/dashboard" passHref>
                  <Button variant="contained" color="primary">
                    Complete Setup
                  </Button>
                </Link>
              )}
            </>
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
