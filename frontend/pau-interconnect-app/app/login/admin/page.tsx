"use client";

import { useState } from "react";
import { getNextPath } from "@/lib/post-login";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button, Input, Typography } from "@/components/ui";
import { getUserRoleProfile } from "@/lib/role-guard";

function adminDestination(): string {
  const next = getNextPath("admin", true);
  return next?.startsWith("/dashboard/admin") || next === "/admin" || next?.startsWith("/admin/")
    ? next
    : "/dashboard/admin";
}

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
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

      if (authError) throw authError;

      // 2. Verify admin status
      if (authData.user) {
        const { isAdmin } = await getUserRoleProfile(
          supabase,
          authData.user.id,
        );

        if (!isAdmin) {
          // Sign them out — they don't belong here
          await supabase.auth.signOut();
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
          setError("Unauthorized: This account does not have administrator privileges.");
          setLoading(false);
          return;
        }
      }

      // 3. Redirect to admin dashboard
      router.push(adminDestination());
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
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
              Admin Portal
            </Typography>
            <Typography variant="body2" color="muted" className="text-center">
              Sign in with your administrator credentials
            </Typography>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 px-4 py-3 rounded-2xl bg-danger-subtle text-danger-fg border border-danger-subtle text-sm font-medium"
            >
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
                  className="text-xs text-brand hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full !rounded-full"
              size="lg"
              isLoading={loading}
            >
              Sign In
            </Button>
          </form>

          <Typography
            variant="body2"
            color="muted"
            className="text-center mt-8"
          >
            Not an admin?{" "}
            <span
              className="text-brand cursor-pointer font-bold hover:underline ml-1"
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
