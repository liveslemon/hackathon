"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { FiLogOut, FiUser, FiBriefcase } from "react-icons/fi";
import { supabase } from "@/lib/supabaseClient";
import {
  Button,
  Typography,
  Stack,
} from "@/components/ui";

interface DashboardHeaderProps {
  userProfile?: any;
  onOpenAnalysis?: () => void;
}

const DashboardHeader = ({ userProfile, onOpenAnalysis }: DashboardHeaderProps) => {
  const router = useRouter();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationSeverity, setNotificationSeverity] = useState<"success" | "error" | "info" | "warning">("info");

  const handleNotificationClose = () => {
    setNotificationOpen(false);
  };

  const handleLogout = () => {
    (async () => {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("Error signing out:", err);
      }
      localStorage.clear();
      setNotificationMessage("Logged out successfully");
      setNotificationSeverity("success");
      setNotificationOpen(true);
      
      setTimeout(() => {
        router.push("/");
      }, 500);
    })();
  };

  const isEmployer = userProfile?.role === "employer";

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 h-20 flex items-center shadow-sm">
      <div className="max-w-7xl w-full mx-auto px-6 flex justify-between items-center text-[#667eea]">
        <div 
          className="flex items-center gap-4 cursor-pointer group" 
          onClick={() => router.push(isEmployer ? "/dashboard/employer" : "/dashboard/student")}
        >
          <div className="w-12 h-12 bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-xl flex items-center justify-center p-2.5 shadow-lg group-hover:scale-110 transition-transform">
            <img src="/favicon.ico" alt="PAU Logo" className="w-full h-full brightness-0 invert" />
          </div>
          <div className="hidden sm:block">
            <Typography variant="h4" weight="bold" className="text-slate-800 tracking-tight">PAU InterConnect</Typography>
            <Typography variant="caption" color="muted" className="mt-0.5">
              Welcome back, <span className="text-[#667eea] font-bold">{isEmployer ? (userProfile.company_name || "Employer") : (userProfile?.name?.split(" ")[0] || userProfile?.full_name?.split(" ")[0] || userProfile?.email || "Student")}!</span>
            </Typography>
          </div>
        </div>
        
        <Stack direction="row" spacing={4} align="center">
          {onOpenAnalysis && !isEmployer && (
            <Button
              variant="solid"
              size="sm"
              onClick={onOpenAnalysis}
              className="hidden md:flex px-6 shadow-indigo-100"
            >
              Analyze CV
            </Button>
          )}
          
          <div className="flex items-center gap-2 bg-slate-50/50 p-1 rounded-2xl border border-slate-100">
            {!isEmployer && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/my-internships")}
                  className="w-10 h-10 p-0 rounded-xl hover:bg-white hover:shadow-sm"
                  title="My Internships"
                >
                  <FiBriefcase size={20} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/profile")}
                  className="w-10 h-10 p-0 rounded-xl hover:bg-white hover:shadow-sm"
                  title="Profile"
                >
                  <FiUser size={20} />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              colorType="danger"
              onClick={handleLogout}
              className="w-10 h-10 p-0 rounded-xl hover:bg-white hover:shadow-sm"
              title="Logout"
            >
              <FiLogOut size={20} />
            </Button>
          </div>
        </Stack>
      </div>

      {notificationOpen && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300 z-[100] border ${
          notificationSeverity === "success" 
            ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
            : "bg-red-50 text-red-700 border-red-100"
        }`}>
          <Typography variant="body2" weight="bold">{notificationMessage}</Typography>
        </div>
      )}
    </header>
  );
};

export default DashboardHeader;
