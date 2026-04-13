"use client";
import React from "react";
import { FiMenu, FiBell, FiSearch, FiBriefcase, FiUser, FiLogOut } from "react-icons/fi";
import { Input, Button, Stack, Typography } from "./ui";
import { cx } from "@/utils/cx";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface TopBarProps {
  onMenuClick: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  userProfile?: any;
}

const TopBar = ({ onMenuClick, searchQuery, onSearchChange, userProfile }: TopBarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  const [isProfileHovered, setIsProfileHovered] = React.useState(false);

  const isEmployer = userProfile?.role === "employer";
  const isAdmin = userProfile?.role === "admin";

  const getSearchPlaceholder = () => {
    if (pathname === "/dashboard/employer") return "Search Activities & Leads...";
    if (pathname.includes("/dashboard/employer/internships/")) return "Search Applicants for this role...";
    if (isEmployer) return "Search Hub & Talent...";
    if (isAdmin) return "Search Users & Roles...";
    return "Search Vacancy...";
  };

  const getUserBadge = () => {
    if (isEmployer) return "Partner";
    if (isAdmin) return "Admin";
    return "Student";
  };

  const handleLogout = async () => {
    localStorage.clear();
    await supabase.auth.signOut();
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = isEmployer ? "/login/employer" : "/login/student";
  };

  return (
    <header className="sticky top-0 z-30 flex items-center h-16 md:h-24 px-4 md:px-12 bg-[#fcfdfe] border-b border-slate-100/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Mobile Menu Trigger */}
      <button 
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors shrink-0 mr-4"
      >
        <FiMenu size={24} />
      </button>
 
      {/* Search and Notify Area - Conditionally Rendered if onSearchChange exists */}
      {onSearchChange && (
        <div className="flex items-center gap-6 ml-auto flex-1 justify-end">
          <div className={cx(
            "w-full transition-all duration-500 ease-out animate-in fade-in slide-in-from-left-4",
            isSearchFocused ? "max-w-4xl" : "max-w-2xl"
          )}>
            <div className="relative group">
              <Input
                placeholder={getSearchPlaceholder()}
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-[#f4f7fa] border border-slate-100 focus:bg-white focus:ring-4 focus:ring-brand/5 group-hover:bg-[#ebf0f5] transition-all rounded-2xl h-10 md:h-14 pl-10 md:pl-14 text-[15px] font-medium"
              />
              <div className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand transition-colors">
                <FiSearch size={22} />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <button className="relative p-3 text-slate-400 hover:text-brand bg-[#f4f7fa] hover:bg-brand/5 rounded-2xl transition-all group">
              <FiBell size={24} />
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 border-2 border-[#fcfdfe] rounded-full group-hover:scale-125 transition-transform" />
            </button>
            
            {/* Account Hub Stretching Pill */}
            <div 
              className={cx(
                "flex items-center bg-[#f4f7fa] hover:bg-[#ebf0f5] rounded-2xl transition-all duration-500 ease-out overflow-hidden group cursor-pointer",
                isProfileHovered ? "max-w-[400px] px-3 shadow-lg shadow-brand/5 bg-white ring-1 ring-slate-100" : "max-w-[56px] px-0"
              )}
              onMouseEnter={() => setIsProfileHovered(true)}
              onMouseLeave={() => setIsProfileHovered(false)}
            >
              <div className={cx(
                "w-10 h-10 md:w-14 md:h-14 flex items-center justify-center shrink-0 transition-all duration-500",
                isProfileHovered ? "text-brand" : "text-slate-400"
              )}>
                <FiUser size={24} />
              </div>

              <div className={cx(
                "flex items-center transition-all duration-500 ease-out overflow-hidden",
                isProfileHovered ? "opacity-100 max-w-[300px] ml-1 mr-4" : "opacity-0 max-w-0 ml-0 mr-0"
              )}>
                <div className="flex flex-col min-w-[120px]">
                  <Typography variant="body2" weight="bold" className="text-slate-900 leading-none mb-1 whitespace-nowrap">
                    {userProfile?.name || getUserBadge()}
                  </Typography>
                  <Typography variant="caption" className="text-slate-400 text-[11px] block whitespace-nowrap">
                    {userProfile?.email}
                  </Typography>
                </div>
                
                <div className="w-[1px] h-8 bg-slate-100 mx-4 shrink-0" />
                
                <button
                  onClick={handleLogout}
                  className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all group/logout shrink-0"
                  title="Sign Out"
                >
                  <FiLogOut size={20} className="group-hover/logout:scale-110 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default TopBar;
