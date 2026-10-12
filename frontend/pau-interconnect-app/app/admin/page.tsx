"use client";

import React, { useState } from "react";
import { FiLock, FiArrowLeft, FiAlertCircle } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  Typography,
  Button,
  Card,
  CardContent,
  Input,
} from "@/components/ui";

const ALLOWED_ADMINS = ["hillary.ilona@pau.edu.ng"];

export default function AdminPortalEntry() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError("Please enter your admin email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Authenticate against Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

      if (authError) throw authError;

      // 2. Server-aligned Admin authorization check
      if (authData.user) {
        const isWhitelisted =
          authData.user.email && ALLOWED_ADMINS.includes(authData.user.email);

        if (isWhitelisted) {
          router.push("/dashboard/admin");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("is_admin, role")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        const isAdmin = profile?.is_admin === true || profile?.role === "admin";
        if (!isAdmin) {
          // Immediately revoke session for non-admin accounts
          await supabase.auth.signOut();
          setError("Unauthorized: This account does not have administrator privileges.");
          return;
        }

        router.push("/dashboard/admin");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Authentication failed. Please verify your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-brand bg-gradient-to-br from-brand via-brand-secondary to-brand">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <Card className="rounded-[40px] shadow-2xl border-none overflow-hidden bg-white">
          <CardContent className="p-10 md:p-12">
            <div className="flex justify-center mb-8">
              <div className="w-20 h-20 bg-brand rounded-[32px] flex items-center justify-center shadow-xl shadow-indigo-100/50 transform -rotate-6">
                <FiLock size={32} className="text-white" />
              </div>
            </div>

            <div className="text-center space-y-2 mb-10">
              <Typography variant="h2" weight="bold">Admin Portal</Typography>
              <Typography color="muted">Sign in with authorized administrator credentials</Typography>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-6 p-4 rounded-2xl bg-red-50 text-red-700 border border-red-100 text-sm font-medium flex items-center gap-3 animate-in fade-in"
              >
                <FiAlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <Input
                label="Admin Email Address"
                type="email"
                placeholder="admin@pau.edu.ng"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                required
                className="bg-slate-50 border-slate-100 focus:bg-white"
              />

              <Input
                label="Security Key / Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                required
                className="bg-slate-50 border-slate-100 focus:bg-white"
              />

              <Button
                type="submit"
                size="lg"
                isLoading={loading}
                className="w-full h-14 text-lg shadow-xl shadow-indigo-100 font-bold"
              >
                Enter Portal
              </Button>
            </form>

            <div className="mt-8 flex justify-center">
              <Button
                variant="ghost"
                leftIcon={<FiArrowLeft />}
                onClick={() => router.push("/")}
                className="text-slate-400 hover:text-slate-600"
              >
                Back to Public Site
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
