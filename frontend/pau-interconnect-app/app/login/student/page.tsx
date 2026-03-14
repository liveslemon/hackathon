"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
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
      const userName = user?.user_metadata?.name || user?.email;

      localStorage.setItem("userName", userName);
      localStorage.setItem("userEmail", user?.email || "");

      setSnackbarMessage(`Welcome back, ${userName}!`);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);

      try {
        const pending = localStorage.getItem("pendingProfile");
        if (pending) {
          const parsed = JSON.parse(pending);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-2">
        <CardHeader className="text-center pt-8">
          <Typography variant="h3" className="mb-2">Welcome Back</Typography>
          <Typography variant="body2" color="muted">Sign in to your student account</Typography>
        </CardHeader>
        
        <CardContent className="pt-6">
          <form onSubmit={handleAuth} className="space-y-6">
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" className="w-full" size="lg">
              Sign In
            </Button>
          </form>

          <Stack spacing={2} className="mt-8">
            <Button
              variant="ghost"
              colorType="secondary"
              onClick={() => router.push("/onboarding")}
              className="text-sm"
            >
              Don't have an account? Sign up
            </Button>
            
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="text-xs"
              >
                Back to Home
              </Button>
              <Button
                variant="outline"
                colorType="secondary"
                onClick={() => router.push("/login/admin")}
                className="text-xs"
              >
                Admin Login
              </Button>
            </div>
          </Stack>
        </CardContent>
      </Card>

      {snackbarOpen && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 z-[100] border ${
          snackbarSeverity === "success" 
            ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
            : "bg-red-50 text-red-700 border-red-100"
        }`}>
          <Typography variant="body2" weight="bold">{snackbarMessage}</Typography>
        </div>
      )}
    </div>
  );
};

export default Login;
