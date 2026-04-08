"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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

const employerSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters."),
  email: z.string().email("Please enter a valid work email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  companyDescription: z.string().min(15, "Please provide a slightly longer description."),
});
type EmployerForm = z.infer<typeof employerSchema>;

export default function EmployerOnboarding() {
  const { register, handleSubmit, formState: { errors } } = useForm<EmployerForm>({
    resolver: zodResolver(employerSchema),
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleRegister = async (data: EmployerForm) => {
    setLoading(true);
    setErrorMsg("");

    try {
      const { email, password, companyName, companyDescription } = data;
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
    <div className="min-h-screen bg-white md:bg-[#f8fafc] flex items-center justify-center">
      <div className="w-full max-w-xl md:mx-6">
        <div className="px-6 py-10 md:p-10 md:bg-white md:rounded-3xl md:shadow-2xl md:border md:border-slate-100">
          <div className="flex flex-col items-center mb-8">
            <img src="/favicon.ico" alt="PAU Logo" className="w-14 h-14 mb-4 rounded-xl" />
            <Typography variant="h3" weight="bold" className="mb-1">Register Your Company</Typography>
            <Typography variant="body2" color="muted">Create an employer account to post internships and discover talent.</Typography>
          </div>

          {errorMsg && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 text-red-700 border border-red-100 text-sm font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(handleRegister)} className="space-y-5">
            <Input
              id="companyName"
              label="Company Name"
              placeholder="Google, Inc."
              error={errors.companyName?.message}
              {...register("companyName")}
            />

            <Input
              id="email"
              label="Work Email Address"
              type="email"
              placeholder="name@company.com"
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

            <Textarea
              id="companyDescription"
              label="Short Company Description"
              placeholder="Tell us about your company..."
              rows={3}
              error={errors.companyDescription?.message}
              {...register("companyDescription")}
            />

            <Button 
              type="submit" 
              className="w-full !rounded-full" 
              size="lg"
              isLoading={loading}
            >
              Create Account
            </Button>
          </form>

          <Typography variant="body2" className="text-center mt-8">
            Already registered?{" "}
            <span 
              className="text-brand cursor-pointer font-bold hover:underline" 
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
        </div>
      </div>
    </div>
  );
}
