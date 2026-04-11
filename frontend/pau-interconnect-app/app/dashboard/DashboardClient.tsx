"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PostInternshipView from "./post/PostInternshipView";
import {
  Button,
  Stack,
  Typography,
  Divider,
} from "@/components/ui";
import { FiLogOut, FiPieChart, FiPlusSquare } from "react-icons/fi";
import AnalyticsView from "./AnalyticsView";

export default function DashboardClient({ session }: { session: any }) {
  const [activeTab, setActiveTab] = useState("analytics");
  const [categories, setCategories] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!session?.user) {
      router.push("/");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.from("internships").select("category");
        
        if (!error && data) {
          const counts: Record<string, number> = {};
          data.forEach((item) => {
            const category = item.category || "Unknown";
            counts[category] = (counts[category] || 0) + 1;
          });
          const categoryArray = Object.entries(counts).map(([label, value]) => ({
            label,
            value,
          }));
          setCategories(categoryArray);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, router]);

  const handleLogout = async () => {
    // Add a safety timeout for logout so the user isn't stuck if Supabase hangs
    const logoutTimeout = setTimeout(() => {
      router.push("/");
    }, 2000);

    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      clearTimeout(logoutTimeout);
      router.push("/");
    }
  };

  if (!session?.user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        <header className="flex justify-between items-center bg-white/60 backdrop-blur-xl p-6 rounded-[32px] border border-white shadow-xl shadow-indigo-50/50">
          <Stack direction="row" align="center" spacing={4}>
            <div className="w-12 h-12 bg-gradient-to-br from-brand to-brand-secondary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <img src="/favicon.ico" alt="Logo" className="w-8 h-8 opacity-90" />
            </div>
            <div>
              <Typography variant="h4" weight="bold">Admin Portal</Typography>
              <Typography variant="caption" weight="semibold" color="muted">Manage your platform ecosystem</Typography>
            </div>
          </Stack>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            leftIcon={<FiLogOut className="w-4 h-4" />}
            className="rounded-xl border-slate-200 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all font-bold"
          >
            Logout
          </Button>
        </header>

        <Stack direction="row" spacing={4} className="flex-wrap gap-y-4">
          <Button
            variant={activeTab === "analytics" ? "solid" : "outline"}
            onClick={() => setActiveTab("analytics")}
            leftIcon={<FiPieChart className="w-5 h-5" />}
            className={`px-8 h-14 rounded-2xl font-bold transition-all duration-300 ${
              activeTab === "analytics" 
                ? "shadow-xl shadow-indigo-100" 
                : "bg-white border-slate-100 text-slate-500 hover:border-brand hover:text-brand"
            }`}
          >
            Analytics Overview
          </Button>
          <Button
            variant={activeTab === "post" ? "solid" : "outline"}
            onClick={() => setActiveTab("post")}
            leftIcon={<FiPlusSquare className="w-5 h-5" />}
            className={`px-8 h-14 rounded-2xl font-bold transition-all duration-300 ${
              activeTab === "post" 
                ? "shadow-xl shadow-indigo-100" 
                : "bg-white border-slate-100 text-slate-500 hover:border-brand hover:text-brand"
            }`}
          >
            Post Internship
          </Button>
        </Stack>

        <Divider className="opacity-40" />

        <main className="animate-in fade-in slide-in-from-bottom-6 duration-500 fill-mode-both">
          {activeTab === "analytics" && <AnalyticsView categories={categories} />}
          {activeTab === "post" && <PostInternshipView />}
        </main>
      </div>
    </div>
  );
}
