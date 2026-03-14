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

export default function EmployerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Verify Employer Role
      if (data.user) {
         const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .single();

         if (profile?.role !== "employer") {
            setErrorMsg("This account is not registered as an Employer.");
            await supabase.auth.signOut();
            setLoading(false);
            return;
         }
      }

      router.push("/dashboard/employer");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-2">
        <CardHeader className="text-center pt-8">
          <Typography variant="h3" className="mb-2">Employer Portal</Typography>
          <Typography variant="body2" color="muted">Sign in to manage your company's internships</Typography>
        </CardHeader>
        
        <CardContent className="pt-6">
          {errorMsg && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <Input
              id="email"
              label="Email Address"
              type="email"
              placeholder="name@company.com"
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

          <Typography variant="body2" className="text-center mt-8">
            Don't have a company account?{" "}
            <span 
              className="text-[#667eea] cursor-pointer font-bold hover:underline" 
              onClick={() => router.push("/onboarding/employer")}
            >
              Register here
            </span>
          </Typography>
          
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="w-full mt-4 text-xs"
          >
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
