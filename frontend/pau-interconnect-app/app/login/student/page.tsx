"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type LoginForm = z.infer<typeof loginSchema>;

const Login = () => {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });
  const [user, setUser] = useState<User | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success",
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    checkUser();
  }, []);

  const handleAuth = async (data: LoginForm) => {
    setIsLoading(true);
    setSnackbarOpen(false);
    
    // Add a 60-second logic timeout for the authentication call
    const authTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Login is taking longer than expected. Please check your internet connection or try refreshing.")), 60000);
    });

    try {
      const { email, password } = data;

      // Race the auth call against the timeout
      const authPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const { data: authData, error } = await Promise.race([authPromise, authTimeoutPromise]) as any;

      if (error) {
        setSnackbarMessage(error.message);
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }

      const { user } = authData;
      const userName = user?.user_metadata?.name || user?.email;

      setSnackbarMessage(`Welcome back, ${userName}!`);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);

      // --- Profile Check ---
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

            if (!insertError) {
              localStorage.removeItem("pendingProfile");
            }
          } else {
            localStorage.removeItem("pendingProfile");
          }
        }
      } catch (profileErr) {
        console.warn("Non-critical profile sync error:", profileErr);
      }

      // Finish successfully
      setTimeout(() => {
        router.push("/dashboard/student");
      }, 800);
    } catch (err: any) {
      console.error("Login failure:", err);
      setSnackbarMessage(err?.message || "An unexpected error occurred. Please try again.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white md:bg-gradient-to-br md:from-brand md:to-brand-secondary flex items-center justify-center">
      <div className="w-full max-w-md md:mx-6">
        <div className="px-6 py-10 md:p-10 md:bg-white md:rounded-3xl md:shadow-2xl">
          {/* Logo - mobile only */}
          <div className="flex flex-col items-center mb-8">
            <img src="/favicon.ico" alt="PAU Logo" className="w-14 h-14 mb-4 rounded-xl" />
            <Typography variant="h3" weight="bold" className="mb-1">Welcome Back</Typography>
            <Typography variant="body2" color="muted">Sign in to your student account</Typography>
          </div>

          {snackbarOpen && snackbarSeverity === "error" && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm font-medium">
              {snackbarMessage}
            </div>
          )}

          <form onSubmit={handleSubmit(handleAuth)} className="space-y-5">
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register("email")}
            />

            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password")}
            />

            <Button type="submit" className="w-full !rounded-full" size="lg" isLoading={isLoading}>
              Log In
            </Button>
          </form>

          <Stack spacing={2} className="mt-8">
            <Button
              variant="ghost"
              colorType="secondary"
              onClick={() => router.push("/onboarding")}
              className="text-sm"
            >
              Don't have an account? <span className="underline font-bold ml-1">Sign Up</span>
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
                className="text-xs hidden md:inline-flex"
              >
                Admin Login
              </Button>
            </div>
          </Stack>
        </div>
      </div>

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
