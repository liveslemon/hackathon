"use client";
import React from "react";
import { Menu, Search, LogOut } from "lucide-react";
import { Input, Avatar } from "./ui";
import { cx } from "@/utils/cx";
import { usePathname } from "next/navigation";
import type { Profile } from "@/types/domain";
import { fastSignOut } from "@/lib/fast-signout";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";

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

    const logoutTarget = isAdmin
      ? "/login/admin"
      : isEmployer
        ? "/login/employer"
        : "/login/student";
    fastSignOut(logoutTarget);
  };

  const displayName =
    userProfile?.name?.split(" ")[0] ||
    userProfile?.full_name?.split(" ")[0] ||
    userProfile?.email?.split("@")[0] ||
    "User";

  return (
    <header className="sticky top-0 z-30 flex items-center h-14 md:h-16 px-4 md:px-8 bg-surface/90 backdrop-blur-md border-b border-border">
      {/* Mobile Menu */}
      <button
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="lg:hidden p-2 -ml-2 text-fg-muted hover:text-fg hover:bg-surface-sunken rounded-xl transition-colors shrink-0 mr-3 min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Main Bar Content */}
      <div className="flex items-center gap-4 flex-1">
        {onSearchChange ? (
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
                className="w-full bg-surface-sunken border-transparent focus:border-border focus:bg-surface rounded-xl h-9 pl-9 text-sm"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none">
                <Search className="w-4 h-4" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Right side controls */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Theme Switcher */}
          <ThemeToggle variant="dropdown" />

          {/* Notifications */}
          {userProfile?.id && <NotificationBell userId={userProfile.id} />}

          <div className="w-px h-5 bg-border mx-1" />

          {/* User Profile and Logout */}
          <div className="flex items-center gap-2 pl-1">
            <Avatar
              name={displayName}
              size="sm"
              className="bg-brand-subtle text-brand"
            />
            <span className="text-xs font-semibold text-fg hidden md:block">
              {displayName}
            </span>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label="Sign out"
              className={cx(
                "p-2 rounded-xl transition-colors ml-1 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer",
                isLoggingOut
                  ? "text-danger opacity-50 cursor-not-allowed"
                  : "text-fg-subtle hover:text-danger hover:bg-danger-subtle",
              )}
              title="Sign Out"
            >
              {isLoggingOut ? (
                <div className="w-4 h-4 rounded-full border-2 border-danger border-t-transparent animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
