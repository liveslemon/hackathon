"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiLogOut, FiUser, FiBriefcase, FiBook, FiActivity } from "react-icons/fi";
import { supabase } from "@/lib/supabaseClient";
import {
  Button,
  Typography,
  Stack,
  Modal,
  Badge,
} from "@/components/ui";

interface DashboardHeaderProps {
  userProfile?: any;
}

const DashboardHeader = ({ userProfile }: DashboardHeaderProps) => {
  const router = useRouter();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationSeverity, setNotificationSeverity] = useState<"success" | "error" | "info" | "warning">("info");
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const fetchMatches = async () => {
    if (!userProfile?.id) return;
    setLoadingMatches(true);
    try {
      const { data } = await supabase
        .from("match_results")
        .select("*, internships(role, company)")
        .eq("user_id", userProfile.id);
      setMatches(data || []);
    } catch (err) {
      console.error("Error fetching matches:", err);
    } finally {
      setLoadingMatches(false);
    }
  };

  useEffect(() => {
    if (analysisOpen) fetchMatches();
  }, [analysisOpen]);

  const handleLogout = async () => {
    localStorage.clear();
    supabase.auth.signOut().catch(err => console.warn("Sign out background error:", err));
    fetch("/api/auth/logout", { method: "POST" }).catch(err => console.warn("Logout API error:", err));
    
    setNotificationMessage("Logging out...");
    setNotificationSeverity("info");
    setNotificationOpen(true);
    
    window.location.href = isEmployer ? "/login/employer" : "/login/student";
  };

  const isEmployer = userProfile?.role === "employer";

  const getMatchColor = (percentage?: number) => {
    if (percentage === undefined || percentage === null) return "primary";
    if (percentage >= 70) return "success";
    if (percentage >= 40) return "warning";
    return "error";
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 h-14 md:h-20 flex items-center shadow-sm">
        <div className="max-w-7xl w-full mx-auto px-4 md:px-6 flex justify-between items-center text-brand">
          <div 
            className="flex items-center gap-2 md:gap-4 cursor-pointer group" 
            onClick={() => router.push(isEmployer ? "/dashboard/employer" : "/dashboard/student")}
          >
            <div className="w-8 h-8 md:w-12 md:h-12 bg-gradient-to-br from-brand to-brand-secondary rounded-lg md:rounded-xl flex items-center justify-center p-1.5 md:p-2.5 shadow-md md:shadow-lg group-hover:scale-110 transition-transform">
              <img src="/favicon.ico" alt="PAU Logo" className="w-full h-full brightness-0 invert" />
            </div>
            <div className="hidden sm:block">
              <Typography variant="h4" weight="bold" className="text-slate-800 tracking-tight">PAU InterConnect</Typography>
              <Typography variant="caption" color="muted" className="mt-0.5">
                Welcome back, <span className="text-brand font-bold">{isEmployer ? (userProfile.company_name || "Employer") : (userProfile?.name?.split(" ")[0] || userProfile?.full_name?.split(" ")[0] || userProfile?.email || "Student")}!</span>
              </Typography>
            </div>
          </div>
          <Stack direction="row" spacing={2} align="center">
            
            <div className="flex items-center gap-1 md:gap-2 bg-slate-50/50 p-1 rounded-full md:rounded-2xl border border-slate-100">
              {!isEmployer && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/my-internships")}
                    className="w-8 h-8 md:w-10 md:h-10 p-0 rounded-full md:rounded-xl hover:bg-white hover:shadow-sm"
                    title="My Internships"
                  >
                    <FiBriefcase className="w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/dashboard/student/logbook")}
                    className="w-8 h-8 md:w-10 md:h-10 p-0 rounded-full md:rounded-xl hover:bg-white hover:shadow-sm"
                    title="Logbook"
                  >
                    <FiBook className="w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/profile")}
                    className="w-8 h-8 md:w-10 md:h-10 p-0 rounded-full md:rounded-xl hover:bg-white hover:shadow-sm"
                    title="Profile"
                  >
                    <FiUser className="w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                size="sm"
                colorType="danger"
                onClick={handleLogout}
                className="w-8 h-8 md:w-10 md:h-10 p-0 rounded-full md:rounded-xl hover:bg-white hover:shadow-sm"
                title="Logout"
              >
                <FiLogOut className="w-4 h-4 md:w-5 md:h-5" />
              </Button>
            </div>
          </Stack>
        </div>

        {notificationOpen && (
          <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300 z-[100] border ${
            notificationSeverity === "success" 
              ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
              : "bg-red-50 text-red-700 border-red-100"
          }`}>
            <Typography variant="body2" weight="bold">{notificationMessage}</Typography>
          </div>
        )}
      </header>

    </>
  );
};

export default DashboardHeader;
