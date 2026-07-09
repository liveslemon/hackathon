"use client";
import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, User, Briefcase, BookOpen } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/types/domain";

interface DashboardUserProfile extends Partial<Profile> {
  name?: string | null;
}

interface DashboardHeaderProps {
  userProfile?: DashboardUserProfile | null;
}

const DashboardHeader = ({ userProfile }: DashboardHeaderProps) => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationSeverity, setNotificationSeverity] = useState<
    "success" | "error" | "info" | "warning"
  >("info");

  const isEmployer = userProfile?.role === "employer";

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setNotificationMessage("Logging out...");
    setNotificationSeverity("info");
    setNotificationOpen(true);

    try {
      // 1. Sign out from Supabase client (requires active session token in storage)
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Supabase signOut error:", err);
    }

    try {
      // 2. Clear cookies on the server
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.warn("Server cookie logout error:", err);
    }

    // 3. Wreak havoc on other local storage entries
    localStorage.clear();

    window.location.href = isEmployer ? "/login/employer" : "/login/student";
  };

  const displayName = isEmployer
    ? userProfile?.company_name || "Employer"
    : userProfile?.name?.split(" ")[0] ||
      userProfile?.full_name?.split(" ")[0] ||
      userProfile?.email ||
      "Student";

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-slate-100 h-14 flex items-center">
        <div className="max-w-7xl w-full mx-auto px-4 md:px-6 flex justify-between items-center">
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() =>
              router.push(
                isEmployer ? "/dashboard/employer" : "/dashboard/student",
              )
            }
          >
            <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center p-1.5 group-hover:scale-105 transition-transform">
              <Image
                src="/favicon.ico"
                alt="PAU Logo"
                width={20}
                height={20}
                className="w-full h-full brightness-0 invert"
              />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-800 leading-none">
                InterConnect
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Hi,{" "}
                <span className="font-semibold text-slate-600">
                  {displayName}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div className="flex items-center gap-0.5 bg-slate-50 p-0.5 rounded-lg border border-slate-100">
              {!isEmployer && (
                <>
                  <button
                    onClick={() => router.push("/my-internships")}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-white transition-all"
                    title="My Internships"
                  >
                    <Briefcase className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => router.push("/dashboard/student/logbook")}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-white transition-all"
                    title="Logbook"
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => router.push("/profile")}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-white transition-all"
                    title="Profile"
                  >
                    <User className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${isLoggingOut ? "opacity-50 cursor-not-allowed text-red-400" : "text-slate-400 hover:text-red-500 hover:bg-red-50"}`}
                title="Logout"
              >
                {isLoggingOut ? (
                  <div className="w-4 h-4 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {notificationOpen && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg animate-in slide-in-from-top-4 duration-300 z-[100] text-sm font-medium ${
              notificationSeverity === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "bg-slate-50 text-slate-700 border border-slate-200"
            }`}
          >
            {notificationMessage}
          </div>
        )}
      </header>
    </>
  );
};

export default DashboardHeader;
