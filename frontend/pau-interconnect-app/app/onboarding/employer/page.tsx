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
  Textarea,
  Typography,
  Stack,
} from "@/components/ui";

export default function EmployerOnboarding() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Insert Profile Data
      if (authData.user) {
         const updates = {
            id: authData.user.id,
            full_name: companyName, // Treating Company Name as Full Name for Fallbacks
            company_name: companyName,
            company_description: companyDescription,
            role: "employer",
            updated_at: new Date().toISOString(),
         };

         const { error: profileError } = await supabase.from("profiles").upsert(updates);
         if (profileError) throw profileError;
      }

      router.push("/dashboard/employer");
    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6">
      <Card className="max-w-xl w-full p-2">
        <CardHeader className="text-center pt-8">
          <Typography variant="h3" className="mb-2">Register Your Company</Typography>
          <Typography variant="body2" color="muted">Create an employer account to post internships and discover talent.</Typography>
        </CardHeader>
        
        <CardContent className="pt-6">
          {errorMsg && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-6">
            <Input
              id="companyName"
              label="Company Name"
              placeholder="Google, Inc."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />

            <Input
              id="email"
              label="Work Email Address"
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

            <Textarea
              id="companyDescription"
              label="Short Company Description"
              placeholder="Tell us about your company..."
              rows={3}
              value={companyDescription}
              onChange={(e) => setCompanyDescription(e.target.value)}
              required
            />

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              isLoading={loading}
            >
              Create Account
            </Button>
          </form>

          <Typography variant="body2" className="text-center mt-8">
            Already registered?{" "}
            <span 
              className="text-[#667eea] cursor-pointer font-bold hover:underline" 
              onClick={() => router.push("/login/employer")}
            >
              Sign in
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
