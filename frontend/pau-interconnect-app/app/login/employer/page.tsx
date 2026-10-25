"use client";

import { useState } from "react";
import { getNextPath } from "@/lib/post-login";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button, Input, Typography } from "@/components/ui";
import { getDashboardPathForRole, getUserRoleProfile } from "@/lib/role-guard";

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
        const { role, isAdmin } = await getUserRoleProfile(
          supabase,
          data.user.id,
        );

        if (role !== "employer" && !isAdmin) {
          await supabase.auth.signOut();
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
          setErrorMsg(
            role === "student"
              ? "This account is registered as a Student. Please sign in via the Student portal."
              : "This account is not registered as an Employer.",
          );
          setLoading(false);
          return;
        }

        const destination =
          getNextPath("employer", isAdmin) ?? getDashboardPathForRole(role, isAdmin);
        router.push(destination);
      } else {
        router.push("/dashboard/employer");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background md:bg-gradient-to-br md:from-brand/10 md:via-background md:to-brand-secondary/10 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="px-6 py-10 md:p-10 bg-surface rounded-3xl border border-border shadow-xl">
          <div className="flex flex-col items-center mb-8">
            <Image
              src="/favicon.ico"
              alt="PAU Logo"
              width={56}
              height={56}
              className="w-14 h-14 mb-4 rounded-xl shadow-sm"
            />
            <Typography variant="h3" weight="bold" className="mb-1 text-center">
              Employer Portal
            </Typography>
            <Typography variant="body2" color="muted" className="text-center">
              Sign in to manage your company&apos;s internships
            </Typography>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mb-6 px-4 py-3 rounded-2xl bg-danger-subtle text-danger-fg border border-danger-subtle text-sm font-medium"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              id="email"
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div>
              <Input
                id="password"
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="flex justify-end mt-1.5">
                <button
                  type="button"
                  onClick={() => router.push("/login/forgot-password")}
                  className="text-xs text-brand dark:text-indigo-400 hover:underline font-semibold"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full !rounded-full font-bold dark:bg-indigo-600"
              size="lg"
              isLoading={loading}
            >
              Sign In
            </Button>
          </form>

          <Typography variant="body2" className="text-center mt-8">
            Don&apos;t have a company account?{" "}
            <span
              className="text-brand dark:text-indigo-400 cursor-pointer font-bold hover:underline ml-1"
              onClick={() => router.push("/onboarding?role=employer")}
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
        </div>
      </div>
    </div>
  );
}
