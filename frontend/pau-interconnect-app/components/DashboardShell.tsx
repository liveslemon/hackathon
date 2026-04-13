"use client";
import React, { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { cx } from "@/utils/cx";

interface DashboardShellProps {
  children: React.ReactNode;
  userProfile?: any;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  className?: string;
}

const DashboardShell = ({ 
  children, 
  userProfile, 
  searchQuery, 
  onSearchChange,
  className 
}: DashboardShellProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#f9fafb]">
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop: Mini/Full, Mobile: Drawer */}
      <Sidebar 
        userProfile={userProfile}
        onClose={() => setIsSidebarOpen(false)}
        isPinned={isPinned}
        onTogglePin={() => setIsPinned(!isPinned)}
        className={cx(
          "fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out",
          isSidebarOpen ? "translate-x-0 w-72" : "-translate-x-full lg:translate-x-0"
        )}
      />

      {/* Main Content Area */}
      <div className={cx(
        "flex-1 flex flex-col min-w-0 transition-all duration-[400ms] ease-in-out",
        isPinned ? "lg:pl-72" : "lg:pl-20"
      )}>
        <TopBar 
          onMenuClick={() => setIsSidebarOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          userProfile={userProfile}
        />
        
        <main className={cx(
          "flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full",
          className
        )}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
