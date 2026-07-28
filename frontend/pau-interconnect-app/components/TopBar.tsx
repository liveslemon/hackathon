"use client";
import React from "react";
import { Menu, Bell, Search, User, LogOut } from "lucide-react";
import { Input } from "./ui";
import { cx } from "@/utils/cx";
import { usePathname } from "next/navigation";
import type { Profile } from "@/types/domain";
import { fastSignOut } from "@/lib/fast-signout";

interface TopBarProps {
  onMenuClick: () => void;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  userProfile?: (Partial<Profile> & { name?: string | null }) | null;
}

const TopBar = ({
  onMenuClick,
  searchQuery,
  onSearchChange,
  userProfile,
}: TopBarProps) => {
  const pathname = usePathname();
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const isEmployer = userProfile?.role === "employer";
  const isAdmin = userProfile?.role === "admin";

  const getSearchPlaceholder = () => {
    if (!pathname) return "Search...";
    if (pathname === "/dashboard/employer") return "Search activities...";
    if (pathname.includes("/dashboard/employer/internships/"))
      return "Search applicants...";
    if (isEmployer) return "Search postings...";
    if (isAdmin) return "Search users...";
    return "Search internships...";
  };

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    fastSignOut(isEmployer ? "/login/employer" : "/login/student");
  };

  const displayName =
    userProfile?.name?.split(" ")[0] ||
    userProfile?.full_name?.split(" ")[0] ||
    userProfile?.email?.split("@")[0] ||
    "User";

  return (
    <header className="sticky top-0 z-30 flex items-center h-14 md:h-16 px-4 md:px-8 bg-white/90 backdrop-blur-sm border-b border-slate-100">
      {/* Mobile Menu */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors shrink-0 mr-3"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search Area */}
      {onSearchChange && (
        <div className="flex items-center gap-4 flex-1">
          <div
            className={cx(
              "flex-1 transition-all duration-300",
              isSearchFocused ? "max-w-2xl" : "max-w-lg",
            )}
          >
            <div className="relative">
              <Input
                placeholder={getSearchPlaceholder()}
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-slate-50 border-transparent focus:border-slate-200 focus:bg-white focus:ring-0 rounded-lg h-9 pl-9 text-sm"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
                <Search className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>

            <div className="w-px h-5 bg-slate-100 mx-1" />

            <div className="flex items-center gap-2 pl-1">
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-medium text-slate-500 hidden md:block">
                {displayName}
              </span>

              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={cx(
                  "p-1.5 rounded-lg transition-colors ml-1",
                  isLoggingOut
                    ? "text-red-400 opacity-50 cursor-not-allowed"
                    : "text-slate-300 hover:text-red-500 hover:bg-red-50",
                )}
                title="Sign Out"
              >
                {isLoggingOut ? (
                  <div className="w-4 h-4 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default TopBar;
