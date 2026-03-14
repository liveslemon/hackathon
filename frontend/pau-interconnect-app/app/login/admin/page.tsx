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

    // 1. Check Mock Accounts First (For Demo/Hackathon)
    const mockAdmin = adminAccounts.find(a => a.email.toLowerCase() === cleanEmail && a.password === cleanPassword);
    
    if (mockAdmin) {
      localStorage.setItem("mock_admin", "true");
      router.push("/dashboard/admin");
      return;
    }

    try {
      // 2. Fallback to Supabase Authenticate
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email: cleanEmail, password: cleanPassword });

      if (authError) throw authError;

      // 2. Verify admin status
      if (authData.user) {
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
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] to-[#764ba2] flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-2 shadow-2xl">
        <CardHeader className="text-center pt-8">
          <Stack align="center" spacing={4} className="mb-6">
            <img
              src="/favicon.ico"
              alt="PAU Logo"
              className="w-12 h-12 rounded-xl"
            />
            <Typography variant="h3" weight="bold">Admin Portal</Typography>
          </Stack>
          <Typography variant="body2" color="muted">Sign in with your administrator credentials</Typography>
        </CardHeader>
        
        <CardContent className="pt-6">
          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
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
              className="w-full" 
              size="lg"
              isLoading={loading}
            >
              Sign In
            </Button>
          </form>

          <Typography variant="body2" className="text-center mt-8 text-slate-500">
            Not an admin?{" "}
            <span 
              className="text-[#667eea] cursor-pointer font-bold hover:underline" 
              onClick={() => router.push("/")}
            >
              Go back home
            </span>
          </Typography>
        </CardContent>
      </Card>
    </div>
  );
}
