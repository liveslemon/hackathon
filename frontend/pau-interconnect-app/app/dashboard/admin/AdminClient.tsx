"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Stack, Typography, Divider } from "@/components/ui";
import { LogOut, Search } from "lucide-react";
import { cx } from "@/utils/cx";
import SearchOverlay from "@/components/SearchOverlay";
import { NotificationBell } from "@/components/NotificationBell";
import { fastSignOut } from "@/lib/fast-signout";
import { supabase } from "@/lib/supabaseClient";

export default function AdminClient({
  children,
  userId,
}: {
  children: React.ReactNode;
  userId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams?.get("tab") || "overview";
  const [showSearch, setShowSearch] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(userId || null);

  useEffect(() => {
    if (!currentUserId) {
      void supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.id) {
          setCurrentUserId(session.user.id);
        }
      });
    }
  }, [currentUserId]);

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "analytics", label: "Analytics" },
    { key: "post", label: "Post Internship" },
    { key: "manage", label: "Manage Platform" },
  ];

  const handleTabChange = (key: string) => {
    router.push(`/dashboard/admin?tab=${key}`);
  };

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    fastSignOut("/");
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-10">
      {showSearch && <SearchOverlay onClose={() => setShowSearch(false)} />}
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 bg-surface/90 backdrop-blur-md p-6 rounded-2xl border border-border shadow-sm overflow-hidden">
          <Stack direction="row" align="center" spacing={4}>
            <Image
              src="/favicon.ico"
              alt="PAU Logo"
              width={40}
              height={40}
              className="w-10 h-10 rounded-xl shadow-sm"
            />
            <Typography variant="h4" weight="bold">
              Admin Control Center
            </Typography>
          </Stack>

          <div className="flex-1 max-w-md w-full relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-fg-subtle group-hover:text-brand transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Super search..."
              readOnly
              onClick={() => setShowSearch(true)}
              className="block w-full pl-12 pr-12 py-3 bg-surface-sunken border border-border rounded-2xl text-sm placeholder:text-fg-subtle text-fg focus:outline-none focus:ring-2 focus:ring-focus-ring/20 focus:border-brand transition-all cursor-pointer shadow-inner"
            />
          </div>

          <Stack direction="row" align="center" spacing={3}>
            {currentUserId && <NotificationBell userId={currentUserId} />}

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              leftIcon={
                isLoggingOut ? (
                  <div className="w-4 h-4 rounded-full border-2 border-danger border-t-transparent animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )
              }
              className={`rounded-xl transition-all ${
                isLoggingOut
                  ? "opacity-50 cursor-not-allowed border-danger-subtle text-danger-fg bg-danger-subtle"
                  : "border-border hover:border-danger hover:text-danger-fg hover:bg-danger-subtle"
              }`}
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          </Stack>
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
                  : "bg-surface border-border text-fg-muted hover:border-brand hover:text-brand",
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
