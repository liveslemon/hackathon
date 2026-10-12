"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getDashboardPathForRole, type AppRole } from "@/lib/role-guard";
import type { Session } from "@supabase/supabase-js";

export default function DashboardClient({
  session,
}: {
  session?: Session | null;
}) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const activeUser = user || session?.user;
    if (!activeUser) {
      router.replace("/login/student?next=/dashboard");
      return;
    }

    const isAdmin = Boolean(profile?.is_admin) || profile?.role === "admin";
    const role = (profile?.role as AppRole) ?? null;

    if (!isAdmin && profile?.onboarding_stage !== "completed") {
      router.replace("/onboarding");
      return;
    }

    router.replace(getDashboardPathForRole(role, isAdmin));
  }, [user, session, profile, loading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand mb-4" />
      <p className="text-sm font-medium text-slate-500">Redirecting to your dashboard...</p>
    </div>
  );
}

