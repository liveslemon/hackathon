"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Card,
  TextField,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";

const Login = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success",
  );

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Optional: you can store the user session if needed
      setUser(session?.user ?? null);
    };

    checkUser();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setSnackbarMessage(error.message);
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } else {
      const { user } = data;
      // Optional: fetch name from user_metadata if set during signup
      const userName = user?.user_metadata?.name || user?.email;

      // Store in localStorage for later
      localStorage.setItem("userName", userName);
      localStorage.setItem("userEmail", user?.email || "");

      setSnackbarMessage(`Welcome back, ${userName}!`);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);

      // If the user signed in and we have a pending profile (saved during signup),
      // create the `profiles` row now so that auth.uid() is available and RLS passes.
      try {
        const pending = localStorage.getItem("pendingProfile");
        if (pending) {
          const parsed = JSON.parse(pending);

          // Check whether a profile already exists for this user
          const { data: existing, error: selectError } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", user?.id)
            .limit(1)
            .maybeSingle();

          if (selectError) {
            console.warn("Error checking existing profile:", selectError);
          }

          if (!existing) {
            const { error: insertError } = await supabase
              .from("profiles")
              .insert({
                id: user?.id,
                full_name: parsed.full_name,
                course: parsed.course,
                level: parsed.level,
                interests: parsed.interests,
                cv_url: parsed.cv_url,
              });

            if (insertError) {
              console.error(
                "Failed to create profile after sign-in:",
                insertError,
              );
            } else {
              localStorage.removeItem("pendingProfile");
            }
          } else {
            // If profile exists, remove pending data to avoid future attempts
            localStorage.removeItem("pendingProfile");
          }
        }
      } catch (e) {
        console.warn("Error processing pending profile:", e);
      }

      setTimeout(() => {
        router.push("/dashboard/student");
      }, 800);
    }
  };

  const handleCloseSnackbar = (
    event?: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "primary.main",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 4,
      }}
    >
      <Card sx={{ maxWidth: 400, width: "100%", p: 4, boxShadow: 3 }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <Typography
            variant="h4"
            component="h1"
            gutterBottom
            fontWeight="bold"
          >
            Welcome Back
          </Typography>
          <Typography color="text.secondary">
            Sign in to your account
          </Typography>
        </Box>

        <Box
          component="form"
          onSubmit={handleAuth}
          sx={{ display: "flex", flexDirection: "column", gap: 3 }}
        >
          <TextField
            id="email"
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            fullWidth
          />

          <TextField
            id="password"
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
          />

          <Button type="submit" variant="contained" fullWidth>
            Sign In
          </Button>
        </Box>

        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Button
            variant="text"
            onClick={() => router.push("/onboarding")}
            sx={{ textTransform: "none", fontSize: "0.875rem" }}
          >
            Do not have an account? Sign up
          </Button>
        </Box>

        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Button
            variant="outlined"
            onClick={() => router.push("/")}
            sx={{ textTransform: "none", fontSize: "0.875rem" }}
          >
            Back to Home
          </Button>
        </Box>

        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Button
            variant="outlined"
            onClick={() => router.push("/admin")}
            sx={{ textTransform: "none", fontSize: "0.875rem" }}
          >
            Admin Login
          </Button>
        </Box>
      </Card>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Login;
