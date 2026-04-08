"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { cx } from "@/utils/cx";
import OverviewView from "@/app/dashboard/admin/overview/page";
import AnalyticsPage from "@/app/dashboard/admin/analytics/page";
import PostInternshipView from "./post/page";
import ManagePlatformView from "./manage/page";
import {
  Button,
  Stack,
  Typography,
  Divider,
} from "@/components/ui";
import { FiLogOut, FiSearch, FiCommand } from "react-icons/fi";
import SearchOverlay from "@/components/SearchOverlay";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAdmin = async () => {
      // Allow bypass for mock accounts during demo
      if (typeof window !== "undefined" && localStorage.getItem("mock_admin") === "true") {
        setAuthorized(true);
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login/admin");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        await supabase.auth.signOut();
        router.replace("/login/admin");
        return;
      }

      setAuthorized(true);
      setLoading(false);
    };

    checkAdmin();

    // Global shortcut for search
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  if (!authorized) return null;

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "analytics", label: "Analytics" },
    { key: "post", label: "Post Internship" },
    { key: "manage", label: "Manage Platform" },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10">
      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-white shadow-sm overflow-hidden">
          <Stack direction="row" align="center" spacing={4}>
            <img
              src="/favicon.ico"
              alt="PAU Logo"
              className="w-10 h-10 rounded-xl shadow-sm"
            />
            <Typography variant="h4" weight="bold">Admin Control Center</Typography>
          </Stack>

          <div className="flex-1 max-w-md w-full relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <FiSearch className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Super search..."
              readOnly
              onClick={() => setShowSearch(true)}
              className="block w-full pl-12 pr-12 py-3 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer hover:bg-slate-50"
            />
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[10px] font-extrabold text-slate-400">
                <FiCommand className="w-2.5 h-2.5" />
                <span>K</span>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            leftIcon={<FiLogOut className="w-4 h-4" />}
            className="rounded-xl border-slate-200 hover:border-red-200 hover:text-red-500 hover:bg-red-50"
          >
            Logout
          </Button>
        </header>

        <Divider className="mb-10 opacity-50" />

        <Stack
          direction="row"
          spacing={3}
          className="flex-wrap gap-y-3 mb-10"
        >
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "solid" : "outline"}
              onClick={() => setActiveTab(tab.key)}
              className={cx(
                "px-8 rounded-2xl font-bold transition-all duration-300",
                activeTab === tab.key 
                  ? "shadow-lg shadow-indigo-100" 
                  : "bg-white border-slate-100 text-slate-600 hover:border-brand hover:text-brand"
              )}
            >
              {tab.label}
            </Button>
          ))}
        </Stack>

        <main className="animate-in fade-in slide-in-from-bottom-8 duration-500">
          {activeTab === "overview" && <OverviewView />}
          {activeTab === "analytics" && <AnalyticsPage />}
          {activeTab === "post" && <PostInternshipView />}
          {activeTab === "manage" && <ManagePlatformView />}
        </main>
      </div>
    </div>
  );
}
