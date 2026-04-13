"use client";
import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button, Stack, Typography, Divider } from "@/components/ui";
import { FiLogOut, FiSearch, FiCommand } from "react-icons/fi";
import { cx } from "@/utils/cx";
import SearchOverlay from "@/components/SearchOverlay";

import DashboardShell from "@/components/DashboardShell";

export default function AdminClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams?.get("tab") || "overview";
  const [showSearch, setShowSearch] = useState(false);

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "analytics", label: "Analytics" },
    { key: "post", label: "Post Internship" },
    { key: "manage", label: "Manage Platform" },
  ];

  const handleTabChange = (key: string) => {
    router.push(`/dashboard/admin?tab=${key}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10">
      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <Stack direction="row" align="center" spacing={4}>
            <img src="/favicon.ico" alt="PAU Logo" className="w-10 h-10 rounded-xl shadow-sm" />
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
              className="block w-full pl-12 pr-12 py-3 bg-slate-50/50 border border-slate-100 rounded-2xl text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer hover:bg-slate-50 shadow-inner"
            />
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

        <Stack direction="row" spacing={3} className="flex-wrap gap-y-3 mb-10">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "solid" : "outline"}
              onClick={() => handleTabChange(tab.key)}
              className={cx(
                "px-8 rounded-xl font-bold transition-all duration-300",
                activeTab === tab.key 
                  ? "shadow-sm border-brand" 
                  : "bg-white border-slate-100 text-slate-600 hover:border-brand hover:text-brand"
              )}
            >
              {tab.label}
            </Button>
          ))}
        </Stack>

        <main className="animate-in fade-in slide-in-from-bottom-8 duration-500">
          {children}
        </main>
      </div>
    </div>
  );
}
