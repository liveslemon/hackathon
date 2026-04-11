"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Typography,
  Stack,
} from "@/components/ui";

const adminAccounts = [
  { email: "admin@pau.edu.ng", password: "admin123" },
  { email: "supervisor@pau.edu.ng", password: "super456" },
  { email: "head@pau.edu.ng", password: "admin789" },
];

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      // 1. Authenticate with Supabase
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });

      if (authError) throw authError;

      // 2. Verify admin status
      if (authData.user) {
        // Special Elevation for the primary admin email
        if (authData.user.email === "hillary.ilona@pau.edu.ng") {
          router.push("/dashboard/admin");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", authData.user.id)
          .single();

        if (profileError) throw profileError;

        if (!profile?.is_admin) {
          // Sign them out — they don't belong here
          await supabase.auth.signOut();
          setError("Unauthorized: Admin access only.");
          setLoading(false);
          return;
        }
      }

      // 3. Redirect to admin dashboard
      router.push("/dashboard/admin");
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white md:bg-gradient-to-br md:from-brand md:to-brand-secondary flex items-center justify-center">
      <div className="w-full max-w-md md:mx-6">
        <div className="px-6 py-10 md:p-10 md:bg-white md:rounded-3xl md:shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <img src="/favicon.ico" alt="PAU Logo" className="w-14 h-14 mb-4 rounded-xl" />
            <Typography variant="h3" weight="bold" className="mb-1">Admin Portal</Typography>
            <Typography variant="body2" color="muted">Sign in with your administrator credentials</Typography>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              id="email"
              label="Admin Email"
              type="email"
              placeholder="admin@pau.edu"
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

            <Button 
              type="submit" 
              className="w-full !rounded-full" 
              size="lg"
              isLoading={loading}
            >
              Sign In
            </Button>
          </form>

          <Typography variant="body2" className="text-center mt-8 text-slate-500">
            Not an admin?{" "}
            <span 
              className="text-brand cursor-pointer font-bold hover:underline" 
              onClick={() => router.push("/")}
            >
              Go back home
            </span>
          </Typography>
        </div>
      </div>
    </div>
  );
}
