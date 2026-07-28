"use client";
import React from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  Briefcase,
  BookOpen,
  User,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  FileText,
} from "lucide-react";
import { cx } from "@/utils/cx";
import { useState } from "react";
import type { Profile } from "@/types/domain";

interface SidebarUserProfile extends Partial<Profile> {
  role?: "student" | "employer" | "admin" | null;
}

interface SidebarProps {
  userProfile?: SidebarUserProfile | null;
  onClose?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
  className?: string;
}

const Sidebar = ({
  userProfile,
  onClose,
  isPinned,
  onTogglePin,
  className,
}: SidebarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  const isExpanded = isPinned || isHovered;
  const isEmployer = userProfile?.role === "employer";
  const isAdmin = userProfile?.role === "admin";

  const studentItems = [
    { label: "Home", icon: Home, href: "/dashboard/student" },
    { label: "My Internships", icon: Briefcase, href: "/my-internships" },
    {
      label: "CV & Career",
      icon: FileText,
      href: "/dashboard/student/cv",
    },
    {
      label: "SIWES Logbook",
      icon: BookOpen,
      href: "/dashboard/student/logbook",
    },
  ];

  const employerItems = [
    { label: "Company Home", icon: Home, href: "/dashboard/employer" },
    {
      label: "My Postings",
      icon: Briefcase,
      href: "/dashboard/employer/internships",
    },
    {
      label: "Review Logbooks",
      icon: BookOpen,
      href: "/dashboard/employer/logbook",
    },
  ];

  const adminItems = [
    { label: "Admin Home", icon: Home, href: "/dashboard/admin" },
    { label: "Manage Roles", icon: User, href: "/dashboard/admin/manage" },
    { label: "Analytics", icon: BarChart3, href: "/dashboard/admin/analytics" },
  ];

  const dashboardItems = isEmployer
    ? employerItems
    : isAdmin
      ? adminItems
      : studentItems;

  const accountItems = [
    {
      label: isEmployer ? "Company Public Page" : "Profile",
      icon: User,
      href: isEmployer ? `/companies/${userProfile?.id}` : "/profile",
      disabled: isEmployer && !userProfile?.id,
    },
    {
      label: "Settings",
      icon: Settings,
      href: isEmployer
        ? "/dashboard/employer/settings"
        : "/dashboard/student/settings",
      disabled: false,
    },
  ];

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cx(
        "flex flex-col h-full bg-white border-r border-slate-100 transition-all duration-[400ms] ease-in-out overflow-hidden",
        isExpanded ? "w-72" : "w-20",
        className,
      )}
    >
      {/* Sidebar Header */}
      <div className="py-6 px-5 flex items-center h-20 shrink-0 transition-all duration-[400ms] ease-in-out relative">
        <div
          className="flex items-center gap-3 cursor-pointer group shrink-0"
          onClick={() =>
            router.push(
              isEmployer ? "/dashboard/employer" : "/dashboard/student",
            )
          }
        >
          <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center p-2 shadow-sm group-hover:scale-105 transition-transform shrink-0">
            <Image
              src="/favicon.ico"
              alt="PAU Logo"
              width={24}
              height={24}
              className="w-full h-full brightness-0 invert"
            />
          </div>
          <div
            className={cx(
              "transition-all duration-[400ms] ease-in-out overflow-hidden flex items-center",
              isExpanded ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0",
            )}
          >
            <span className="text-[15px] font-bold text-slate-800 tracking-tight whitespace-nowrap ml-1">
              InterConnect
            </span>
          </div>
        </div>

        <div
          className={cx(
            "absolute right-4 flex items-center gap-1 transition-all duration-[400ms] ease-in-out overflow-hidden",
            isExpanded ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0",
          )}
        >
          <button
            onClick={onTogglePin}
            className={cx(
              "p-2 rounded-lg transition-all duration-200 hidden lg:flex items-center justify-center",
              isPinned
                ? "bg-slate-100 text-slate-600"
                : "text-slate-300 hover:text-slate-500 hover:bg-slate-50",
            )}
            title={isPinned ? "Unpin sidebar" : "Pin sidebar"}
          >
            {isPinned ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col px-3 py-4 space-y-8 overflow-y-auto no-scrollbar">
        {/* Dashboard Section */}
        <div>
          <div className="px-5 mb-3 h-4 flex items-center">
            <div
              className={cx(
                "transition-all duration-[400ms] ease-in-out overflow-hidden flex items-center",
                isExpanded ? "opacity-100 max-w-[200px]" : "opacity-0 max-w-0",
              )}
            >
              <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest whitespace-nowrap">
                Dashboard
              </span>
            </div>
          </div>
          <nav className="space-y-0.5">
            {dashboardItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    if (onClose) onClose();
                  }}
                  title={!isExpanded ? item.label : undefined}
                  className={cx(
                    "w-full flex items-center rounded-xl text-[13px] font-medium transition-all duration-200 group relative overflow-hidden h-11 px-5",
                    !isExpanded && "pl-[18px]",
                    isActive
                      ? "bg-slate-50 text-slate-800"
                      : "text-slate-400 hover:bg-slate-50/50 hover:text-slate-600",
                  )}
                >
                  <Icon
                    className={cx(
                      "w-[18px] h-[18px] transition-colors shrink-0",
                      isActive ? "text-indigo-600" : "text-slate-350",
                    )}
                  />
                  <div
                    className={cx(
                      "transition-all duration-[400ms] ease-in-out overflow-hidden flex items-center ml-3",
                      isExpanded
                        ? "opacity-100 max-w-[200px]"
                        : "opacity-0 max-w-0",
                    )}
                  >
                    <span className="truncate whitespace-nowrap">
                      {item.label}
                    </span>
                  </div>
                  {!isExpanded && isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-600 rounded-r-full" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Account Section - Pushed to Bottom */}
        <div className="mt-auto space-y-8">
          <div>
            <div className="px-5 mb-3 h-4 flex items-center">
              <div
                className={cx(
                  "transition-all duration-[400ms] ease-in-out overflow-hidden flex items-center",
                  isExpanded
                    ? "opacity-100 max-w-[200px]"
                    : "opacity-0 max-w-0",
                )}
              >
                <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest whitespace-nowrap">
                  Account
                </span>
              </div>
            </div>
            <nav className="space-y-0.5">
              {accountItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
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
                      "w-full flex items-center rounded-xl text-[13px] font-medium transition-all duration-200 group relative overflow-hidden h-11 px-5",
                      !isExpanded && "pl-[18px]",
                      item.disabled ? "opacity-40 cursor-not-allowed" : "",
                      isActive
                        ? "bg-slate-50 text-slate-800"
                        : "text-slate-400 hover:bg-slate-50/50 hover:text-slate-600",
                    )}
                  >
                    <Icon
                      className={cx(
                        "w-[18px] h-[18px] transition-colors shrink-0",
                        isActive ? "text-indigo-600" : "text-slate-350",
                      )}
                    />
                    <div
                      className={cx(
                        "transition-all duration-[400ms] ease-in-out overflow-hidden flex items-center ml-3",
                        isExpanded
                          ? "opacity-100 max-w-[200px]"
                          : "opacity-0 max-w-0",
                      )}
                    >
                      <span className="truncate whitespace-nowrap">
                        {item.label}
                      </span>
                    </div>
                    {!isExpanded && isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-indigo-600 rounded-r-full" />
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
