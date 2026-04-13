"use client";
import React, { useState, useEffect } from "react";
import DashboardShell from "@/components/DashboardShell";

interface DashboardShellWrapperProps {
  children: React.ReactNode;
  userProfile?: any;
}

export default function DashboardShellWrapper({ children, userProfile }: DashboardShellWrapperProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const onSearchChange = (query: string) => {
    setSearchQuery(query);
    // Broadcast search query to children (like InternshipGrid) via custom event
    window.dispatchEvent(new CustomEvent("dashboardSearch", { detail: query }));
  };

  useEffect(() => {
    const handleGridSearch = (e: Event) => {
      const query = (e as CustomEvent).detail;
      setSearchQuery(query || "");
    };
    window.addEventListener("gridSearchChange", handleGridSearch);
    return () => window.removeEventListener("gridSearchChange", handleGridSearch);
  }, []);

  return (
    <DashboardShell 
      userProfile={userProfile} 
      searchQuery={searchQuery}
      onSearchChange={onSearchChange}
    >
      {children}
    </DashboardShell>
  );
}
