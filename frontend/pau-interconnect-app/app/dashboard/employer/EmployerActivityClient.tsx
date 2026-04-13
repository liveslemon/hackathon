"use client";

import React, { useState, useEffect } from "react";
import { Stack, Typography } from "@/components/ui";
import { FiUser, FiClock, FiChevronRight } from "react-icons/fi";
import Link from "next/link";
import { cx } from "@/utils/cx";

export function EmployerActivityClient({ 
  initialItems, 
  type 
}: { 
  initialItems: any[], 
  type: "applicants" | "logbooks" 
}) {
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
       const query = (e as CustomEvent).detail;
       setSearchQuery(query || "");
    };
    window.addEventListener("dashboardSearch", handleGlobalSearch);
    return () => window.removeEventListener("dashboardSearch", handleGlobalSearch);
  }, []);

  const filteredItems = initialItems.filter(item => {
    const searchStr = type === "applicants" 
      ? `${item.profiles?.full_name} ${item.internships?.role}`
      : `${item.profiles?.full_name} ${item.date}`;
    return searchStr.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (filteredItems.length === 0 && searchQuery) {
    return (
      <div className="p-12 text-center bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
        <Typography variant="body2" color="muted">No matches for "{searchQuery}"</Typography>
      </div>
    );
  }

  if (initialItems.length === 0) {
    return (
      <div className="p-16 text-center">
         <Typography variant="body2" color="muted">
           {type === "applicants" ? "No candidate leads yet." : "Status clear. No pending logs."}
         </Typography>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-50">
      {filteredItems.map((item: any) => (
        <Link 
          key={item.id} 
          href={type === "applicants" ? `/dashboard/employer/internships/${item.internship_id}` : "/dashboard/employer/logbook"} 
          className="block group"
        >
          <div className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-5">
              <div className={cx(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                type === "applicants" 
                  ? "bg-slate-50 text-slate-400 group-hover:bg-brand/5 group-hover:text-brand" 
                  : "bg-indigo-50/50 text-indigo-400 group-hover:bg-indigo-100 group-hover:text-indigo-600"
              )}>
                {type === "applicants" ? <FiUser className="w-6 h-6" /> : <FiClock className="w-6 h-6" />}
              </div>
              <div>
                <Typography variant="h6" weight="bold" className="text-slate-900 group-hover:text-brand transition-colors">
                  {item.profiles?.full_name}
                </Typography>
                <Typography variant="caption" className="text-slate-500 font-medium">
                  {type === "applicants" 
                    ? `${item.internships?.role} • ${item.match_score || 0}% Match Score`
                    : `Log entry for ${new Date(item.date).toLocaleDateString()}`}
                </Typography>
              </div>
            </div>
            {type === "applicants" ? (
              <FiChevronRight className="text-slate-300 group-hover:text-brand transition-colors" />
            ) : (
              <div className="px-4 py-2 rounded-xl bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider group-hover:bg-brand group-hover:text-white transition-all">
                Approve
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
