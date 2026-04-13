"use client";
import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  FiHome, 
  FiBriefcase, 
  FiBook, 
  FiUser, 
  FiLogOut,
  FiSettings,
  FiX,
  FiChevronLeft,
  FiChevronRight
} from "react-icons/fi";
import { Typography, Stack, Button } from "./ui";
import { cx } from "@/utils/cx";
import { useState } from "react";

interface SidebarProps {
  userProfile?: any;
  onClose?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  className?: string;
}

const Sidebar = ({ userProfile, onClose, isPinned, onTogglePin, className }: SidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);
  
  const isExpanded = isPinned || isHovered;
  const isEmployer = userProfile?.role === "employer";
  const isAdmin = userProfile?.role === "admin";

  const studentItems = [
    { label: "Home", icon: FiHome, href: "/dashboard/student" },
    { label: "My Internships", icon: FiBriefcase, href: "/my-internships" },
    { label: "SIWES Logbook", icon: FiBook, href: "/dashboard/student/logbook" },
  ];

  const employerItems = [
    { label: "Company Home", icon: FiHome, href: "/dashboard/employer" },
    { label: "My Postings", icon: FiBriefcase, href: "/dashboard/employer/internships" },
    { label: "Review Logbooks", icon: FiBook, href: "/dashboard/employer/logbook" },
  ];

  const adminItems = [
    { label: "Admin Home", icon: FiHome, href: "/dashboard/admin" },
    { label: "Manage Roles", icon: FiUser, href: "/dashboard/admin/manage" },
    { label: "Analytics", icon: FiBriefcase, href: "/dashboard/admin/analytics" },
  ];

  const dashboardItems = isEmployer ? employerItems : (isAdmin ? adminItems : studentItems);

  const accountItems = [
    { label: isEmployer ? "Company Profile" : "Profile Settings", icon: FiUser, href: "/profile" },
    { label: "Help Center", icon: FiSettings, href: "#", disabled: true },
  ];


  return (
    <aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cx(
        "flex flex-col h-full bg-white border-r border-slate-100 transition-all duration-[400ms] ease-in-out overflow-hidden",
        isExpanded ? "w-72" : "w-20",
        className
      )}
    >
      {/* Sidebar Header */}
      <div className="py-6 px-5 flex items-center h-20 shrink-0 transition-all duration-[400ms] ease-in-out relative">
        <div 
          className="flex items-center gap-3 cursor-pointer group shrink-0"
          onClick={() => router.push(isEmployer ? "/dashboard/employer" : "/dashboard/student")}
        >
          <div className="w-10 h-10 bg-brand rounded-2xl flex items-center justify-center p-2 shadow-sm group-hover:scale-105 transition-transform shrink-0">
            <img src="/favicon.ico" alt="PAU Logo" className="w-full h-full brightness-0 invert" />
          </div>
          <div className={cx(
            "transition-all duration-[400ms] ease-in-out overflow-hidden flex items-center",
            isExpanded ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0"
          )}>
            <Typography variant="h5" weight="bold" className="text-slate-800 tracking-tight leading-tight whitespace-nowrap ml-3">
              Job in
            </Typography>
          </div>
        </div>
        
        <div className={cx(
          "absolute right-4 flex items-center gap-1 transition-all duration-[400ms] ease-in-out overflow-hidden",
          isExpanded ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0"
        )}>
          <button 
            onClick={onTogglePin}
            className={cx(
              "p-2 rounded-xl transition-all duration-200 hidden lg:flex items-center justify-center",
              isPinned ? "bg-brand/10 text-brand" : "text-slate-300 hover:text-slate-600 hover:bg-slate-50"
            )}
            title={isPinned ? "Unpin sidebar" : "Pin sidebar"}
          >
            {isPinned ? <FiChevronLeft size={18} /> : <FiChevronRight size={18} />}
          </button>
          {onClose && (
            <button onClick={onClose} className="lg:hidden p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <FiX size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col px-3 py-4 space-y-8 overflow-y-auto no-scrollbar">
        {/* Dashboard Section */}
        <div>
          <div className="px-5 mb-4 h-4 flex items-center">
            <div className={cx(
              "transition-all duration-[400ms] ease-in-out overflow-hidden flex items-center",
              isExpanded ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0"
            )}>
              <Typography variant="caption" className="block font-bold text-slate-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                Dashboard
              </Typography>
            </div>
          </div>
          <nav className="space-y-1">
            {dashboardItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    if (onClose) onClose();
                  }}
                  title={!isExpanded ? item.label : undefined}
                  className={cx(
                    "w-full flex items-center rounded-2xl text-[13px] font-semibold transition-all duration-[400ms] ease-in-out group relative overflow-hidden h-12 md:h-14 px-5",
                    !isExpanded && "pl-[18px]",
                    isActive 
                      ? "bg-brand/5 text-brand shadow-sm shadow-brand/5" 
                      : "text-slate-400 hover:bg-slate-50 hover:text-slate-900 focus:outline-none"
                  )}
                >
                  <item.icon size={20} className={cx(
                    "transition-transform group-hover:scale-110 shrink-0",
                    isActive ? "text-brand" : "text-slate-400"
                  )} />
                  <div className={cx(
                    "transition-all duration-[400ms] ease-in-out overflow-hidden flex items-center ml-4",
                    isExpanded ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0"
                  )}>
                    <span className="truncate whitespace-nowrap">{item.label}</span>
                  </div>
                  {!isExpanded && isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand rounded-r-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Account Section - Pushed to Bottom */}
        <div className="mt-auto space-y-8">
          <div>
            <div className="px-5 mb-4 h-4 flex items-center">
              <div className={cx(
                "transition-all duration-[400ms] ease-in-out overflow-hidden flex items-center",
                isExpanded ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0"
              )}>
                <Typography variant="caption" className="block font-bold text-slate-400 uppercase tracking-widest text-[10px] whitespace-nowrap">
                  Account
                </Typography>
              </div>
            </div>
            <nav className="space-y-1">
              {accountItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      if (item.disabled) return;
                      router.push(item.href);
                      if (onClose) onClose();
                    }}
                    title={!isExpanded ? item.label : undefined}
                    className={cx(
                      "w-full flex items-center rounded-2xl text-[13px] font-semibold transition-all duration-[400ms] ease-in-out group relative overflow-hidden h-12 md:h-14 px-5",
                      !isExpanded && "pl-[18px]",
                      item.disabled ? "opacity-50 cursor-not-allowed" : "",
                      isActive 
                        ? "bg-brand/5 text-brand shadow-sm shadow-brand/5" 
                        : "text-slate-400 hover:bg-slate-50 hover:text-slate-900 focus:outline-none"
                    )}
                  >
                    <item.icon size={20} className={cx(
                      "transition-transform group-hover:scale-110 shrink-0",
                      isActive ? "text-brand" : "text-slate-400"
                    )} />
                    <div className={cx(
                      "transition-all duration-[400ms] ease-in-out overflow-hidden flex items-center ml-4",
                      isExpanded ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0"
                    )}>
                      <span className="truncate whitespace-nowrap">{item.label}</span>
                    </div>
                    {!isExpanded && isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-brand rounded-r-full" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
