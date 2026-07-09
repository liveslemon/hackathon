"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  clearDevModeRoleCookie,
  getDashboardPathForRole,
  getUserRoleProfile,
  isDevToolbarEnabled,
  type AppRole,
} from "@/lib/role-guard";

const DEV_TOOLBAR_ENABLED = isDevToolbarEnabled();

// Map each role to a predefined real account in the database.
// You can set these in .env.local to avoid hardcoding credentials in source control.
const PREDEFINED_ACCOUNTS: Record<
  AppRole,
  { email?: string; password?: string }
> = {
  student: {
    email: process.env.NEXT_PUBLIC_DEV_STUDENT_EMAIL || "student@example.com",
    password: process.env.NEXT_PUBLIC_DEV_STUDENT_PASSWORD || "password123",
  },
  employer: {
    email: process.env.NEXT_PUBLIC_DEV_EMPLOYER_EMAIL || "employer@example.com",
    password: process.env.NEXT_PUBLIC_DEV_EMPLOYER_PASSWORD || "password123",
  },
  admin: {
    email: process.env.NEXT_PUBLIC_DEV_ADMIN_EMAIL || "admin@example.com",
    password: process.env.NEXT_PUBLIC_DEV_ADMIN_PASSWORD || "password123",
  },
};

// Remove this component from app/layout.tsx to disable the toolbar entirely.
export default function DevToolbar() {
  const router = useRouter();
  const [loading, setLoading] = useState<AppRole | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!DEV_TOOLBAR_ENABLED) {
    return null;
  }

  const handleLogin = async (role: AppRole) => {
    setLoading(role);
    setMessage(null);

    try {
      // Clear any mock dev mode cookie to ensure pure real authentication
      if (typeof document !== "undefined") {
        document.cookie = clearDevModeRoleCookie();
      }

      const account = PREDEFINED_ACCOUNTS[role];
      if (!account.email || !account.password) {
        throw new Error(`Missing predefined credentials for role: ${role}`);
      }

      // Perform actual Supabase authentication
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password: account.password,
      });

      if (error) {
        throw error;
      }

      const user = authData.user;

      // Load their real profile to determine the exact dashboard path
      const { role: actualRole, isAdmin } = await getUserRoleProfile(
        supabase,
        user?.id ?? "",
      );

      const destination = getDashboardPathForRole(actualRole, isAdmin);
      router.replace(destination);
    } catch (err: unknown) {
      console.error("Auto-login error:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Unable to switch role right now.";
      setMessage(errorMsg);
    } finally {
      setLoading(null);
    }
  };

  const handleSignOut = async () => {
    try {
      if (typeof document !== "undefined") {
        document.cookie = clearDevModeRoleCookie();
      }
      await supabase.auth.signOut();
      setMessage(null);
      router.replace("/");
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-72 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        <span>Quick Login (Real Auth)</span>
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Logs directly into predefined real database accounts.
      </p>

      <div className="flex flex-col gap-2">
        <button
          disabled={loading !== null}
          onClick={() => handleLogin("student")}
          className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-left text-sm transition-colors hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "student" ? "Signing in..." : "Login as Student"}
        </button>
        <button
          disabled={loading !== null}
          onClick={() => handleLogin("employer")}
          className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-left text-sm transition-colors hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "employer" ? "Signing in..." : "Login as Employer"}
        </button>
        <button
          disabled={loading !== null}
          onClick={() => handleLogin("admin")}
          className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-left text-sm transition-colors hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "admin" ? "Signing in..." : "Login as Admin"}
        </button>
        <button
          onClick={handleSignOut}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-red-50 hover:text-red-600"
        >
          Sign Out
        </button>
      </div>

      {message && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {message}
        </p>
      )}
    </div>
  );
}
