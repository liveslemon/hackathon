"use client";

import React, { useState, useEffect } from "react";
import { Typography } from "@/components/ui";
import { User, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cx } from "@/utils/cx";
import { formatDistanceToNow } from "date-fns";

interface EmployerActivityItem {
  id: string;
  internship_id?: string;
  created_at?: string;
  date?: string;
  match_score?: number;
  profiles?: {
    full_name?: string;
  };
  internships?: {
    role?: string;
  };
}

export function EmployerActivityClient({
  initialItems,
  type,
}: {
  initialItems: EmployerActivityItem[];
  type: "applicants" | "logbooks";
}) {
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
      const query = (e as CustomEvent<string>).detail;
      setSearchQuery(query || "");
    };
    window.addEventListener("dashboardSearch", handleGlobalSearch);
    return () =>
      window.removeEventListener("dashboardSearch", handleGlobalSearch);
  }, []);

  const filteredItems = initialItems.filter((item) => {
    const searchStr =
      type === "applicants"
        ? `${item.profiles?.full_name} ${item.internships?.role}`
        : `${item.profiles?.full_name} ${item.date}`;
    return searchStr.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (filteredItems.length === 0 && searchQuery) {
    return (
      <div className="p-8 text-center bg-surface-sunken rounded-2xl border border-dashed border-border">
        <Typography variant="body2" color="muted">
          No matches for &quot;{searchQuery}&quot;
        </Typography>
      </div>
    );
  }

  if (initialItems.length === 0) {
    return (
      <div className="p-12 text-center">
        <Typography variant="body2" color="muted">
          {type === "applicants"
            ? "No candidate leads yet."
            : "Status clear. No pending logs."}
        </Typography>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {filteredItems.map((item) => (
        <Link
          key={item.id}
          href={
            type === "applicants"
              ? `/dashboard/employer/internships/${item.internship_id}`
              : "/dashboard/employer/logbook"
          }
          className="block group"
        >
          <div className="p-5 flex items-center justify-between hover:bg-surface-sunken transition-colors">
            <div className="flex items-center gap-4">
              <div
                className={cx(
                  "w-11 h-11 rounded-xl flex items-center justify-center transition-colors",
                  type === "applicants"
                    ? "bg-surface-sunken text-fg-muted group-hover:bg-brand-subtle group-hover:text-brand"
                    : "bg-brand-subtle text-brand group-hover:bg-brand group-hover:text-fg-inverse",
                )}
              >
                {type === "applicants" ? (
                  <User className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
              </div>
              <div>
                <Typography
                  variant="body1"
                  weight="bold"
                  className="text-fg group-hover:text-brand transition-colors"
                >
                  {item.profiles?.full_name}
                </Typography>
                <Typography
                  variant="caption"
                  className="text-fg-muted font-medium"
                >
                  {type === "applicants"
                    ? `${item.internships?.role} • ${item.match_score || 0}% Match Score${
                        item.created_at
                          ? ` • ${formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}`
                          : ""
                      }`
                    : `Log entry for ${item.date ? new Date(item.date).toLocaleDateString() : "Unknown date"}`}
                </Typography>
              </div>
            </div>
            {type === "applicants" ? (
              <ChevronRight className="text-fg-subtle group-hover:text-brand transition-colors w-5 h-5" />
            ) : (
              <div className="px-3.5 py-1.5 rounded-lg bg-surface-sunken text-fg-muted text-[11px] font-bold uppercase tracking-wider group-hover:bg-brand group-hover:text-fg-inverse transition-all">
                Approve
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
