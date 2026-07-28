"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  DEV_AUTH_MODE_COOKIE_NAME,
  clearDevModeRoleCookie,
  getDevAuthModeFromCookie,
  getDashboardPathForRole,
  getUserRoleProfile,
  isDevToolbarEnabled,
  setDevAuthModeCookie,
  setDevModeRoleCookie,
  type DevAuthMode,
  type AppRole,
} from "@/lib/role-guard";
const STORAGE_KEY = "dev-toolbar-open-v2";

// Map each role to a predefined real account in the database.
// You can set these in .env.local to avoid hardcoding credentials in source control.
const PREDEFINED_ACCOUNTS: Record<
  AppRole,
  { email?: string; password?: string }
> = {
  student: {
    email: process.env.NEXT_PUBLIC_DEV_STUDENT_EMAIL,
    password: process.env.NEXT_PUBLIC_DEV_STUDENT_PASSWORD,
  },
  employer: {
    email: process.env.NEXT_PUBLIC_DEV_EMPLOYER_EMAIL,
    password: process.env.NEXT_PUBLIC_DEV_EMPLOYER_PASSWORD,
  },
  admin: {
    email: process.env.NEXT_PUBLIC_DEV_ADMIN_EMAIL,
    password: process.env.NEXT_PUBLIC_DEV_ADMIN_PASSWORD,
  },
};

// Remove this component from app/layout.tsx to disable the toolbar entirely.
export default function DevToolbar() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<DevAuthMode>("real");
  const [actingRole, setActingRole] = useState<AppRole | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [activeEmail, setActiveEmail] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState<AppRole | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const isBusy = loading !== null || isSigningOut || actingRole !== null;

  useEffect(() => {
    setMounted(true);
    try {
      const persisted = localStorage.getItem(STORAGE_KEY);
      if (persisted === "0") {
        setIsOpen(false);
      } else if (persisted === "1") {
        setIsOpen(true);
      }

      const currentMode = getDevAuthModeFromCookie(
        getCookieValue(DEV_AUTH_MODE_COOKIE_NAME),
      );
      setMode(currentMode);
    } catch {
      // Ignore storage and cookie access errors in strict browser modes.
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    void refreshActiveUser();
  }, [mounted]);

  const setToolbarOpen = (nextOpen: boolean) => {
    setIsOpen(nextOpen);
    try {
      localStorage.setItem(STORAGE_KEY, nextOpen ? "1" : "0");
    } catch {
      // Ignore storage failures.
    }
  };

  const updateMode = (nextMode: DevAuthMode) => {
    setMode(nextMode);
    if (typeof document !== "undefined") {
      document.cookie = setDevAuthModeCookie(nextMode);
      if (nextMode === "real") {
        document.cookie = clearDevModeRoleCookie();
      }
    }
  };

  const refreshActiveUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    setActiveEmail(user?.email ?? null);
    if (!user?.id) {
      setActiveRole(null);
      return;
    }

    const { role, isAdmin } = await getUserRoleProfile(supabase, user.id);
    setActiveRole(isAdmin ? "admin" : role);
  };

  const handleLogin = async (role: AppRole) => {
    setLoading(role);
    setMessage(null);

    try {
      updateMode("real");

      // Clear any mock dev mode cookie to ensure pure real authentication
      if (typeof document !== "undefined") {
        document.cookie = clearDevModeRoleCookie();
      }

      const account = PREDEFINED_ACCOUNTS[role];
      if (!account.email || !account.password) {
        throw new Error(
          `Missing real-auth credentials for ${role}. Set NEXT_PUBLIC_DEV_${role.toUpperCase()}_EMAIL and NEXT_PUBLIC_DEV_${role.toUpperCase()}_PASSWORD in .env.local.`,
        );
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

      if (!actualRole && !isAdmin) {
        throw new Error(
          "Logged in but could not determine role profile. Check profiles.role or profiles.is_admin.",
        );
      }

      const destination = getDashboardPathForRole(actualRole, isAdmin);
      await refreshActiveUser();
      router.replace(destination);
      router.refresh();
    } catch (err: unknown) {
      console.error("Auto-login error:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Unable to switch role right now.";
      setMessage(errorMsg);
    } finally {
      setLoading(null);
    }
  };

  const handleMockSwitch = async (role: AppRole) => {
    setActingRole(role);
    setMessage(null);

    try {
      updateMode("mock");
      if (typeof document !== "undefined") {
        document.cookie = setDevModeRoleCookie(role);
      }

      // Ensure there is no stale authenticated session while in mock mode.
      await supabase.auth.signOut();
      await refreshActiveUser();

      const destination = getDashboardPathForRole(role, role === "admin");
      router.replace(destination);
      router.refresh();
    } catch (err: unknown) {
      console.error("Mock switch error:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Unable to switch mock role.";
      setMessage(errorMsg);
    } finally {
      setActingRole(null);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      if (typeof document !== "undefined") {
        document.cookie = clearDevModeRoleCookie();
      }
      await supabase.auth.signOut();
      await refreshActiveUser();
      setMessage(null);
      router.replace("/");
      router.refresh();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!mounted) {
    return null;
  }

  const hostname =
    typeof window !== "undefined" ? window.location.hostname : null;
  const toolbarEnabled = isDevToolbarEnabled(hostname);

  if (!toolbarEnabled) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setToolbarOpen(true)}
        className="fixed bottom-4 right-4 z-9999 rounded-full border border-slate-200 bg-white/95 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 shadow-xl backdrop-blur-md"
      >
        Dev Mode
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-9999 w-72 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        <span>Dev Auth Switcher</span>
        <button
          type="button"
          onClick={() => setToolbarOpen(false)}
          className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-slate-500 hover:bg-slate-50"
        >
          Hide
        </button>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Keep role switching inside one explicit mode: real auth or mock role.
      </p>

      <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => updateMode("real")}
          className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
            mode === "real"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Real Auth
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => updateMode("mock")}
          className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
            mode === "mock"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Mock Role
        </button>
      </div>

      <p className="mb-2 text-[11px] text-slate-500">
        Mode: <span className="font-semibold text-slate-700">{mode}</span>
      </p>
      <p className="mb-3 text-[11px] text-slate-500">
        Session: {activeEmail ? activeEmail : "signed out"}
      </p>
      <p className="mb-3 text-[11px] text-slate-500">
        Role: {activeRole ? activeRole : "n/a"}
      </p>

      <div className="flex flex-col gap-2">
        <button
          disabled={isBusy}
          onClick={() =>
            mode === "real"
              ? handleLogin("student")
              : handleMockSwitch("student")
          }
          className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-left text-sm transition-colors hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "student" || actingRole === "student"
            ? "Switching..."
            : mode === "real"
              ? "Login as Student"
              : "Use Student Mock Role"}
        </button>
        <button
          disabled={isBusy}
          onClick={() =>
            mode === "real"
              ? handleLogin("employer")
              : handleMockSwitch("employer")
          }
          className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-left text-sm transition-colors hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "employer" || actingRole === "employer"
            ? "Switching..."
            : mode === "real"
              ? "Login as Employer"
              : "Use Employer Mock Role"}
        </button>
        <button
          disabled={isBusy}
          onClick={() =>
            mode === "real" ? handleLogin("admin") : handleMockSwitch("admin")
          }
          className="w-full rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-left text-sm transition-colors hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "admin" || actingRole === "admin"
            ? "Switching..."
            : mode === "real"
              ? "Login as Admin"
              : "Use Admin Mock Role"}
        </button>
        <button
          disabled={isBusy}
          onClick={handleSignOut}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:bg-red-50 hover:text-red-600"
        >
          {isSigningOut ? "Signing out..." : "Sign Out"}
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

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const key = `${name}=`;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(key)) {
      return trimmed.slice(key.length);
    }
  }
  return null;
}
