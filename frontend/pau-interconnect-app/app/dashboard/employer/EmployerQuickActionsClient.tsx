"use client";

import React from "react";
import Link from "next/link";
import { cx } from "@/utils/cx";
import { Typography } from "@/components/ui";
import { Plus, List, Edit3 } from "lucide-react";
import { PostInternshipButton } from "./EmployerClient";

interface EmployerProfile {
  id: string;
  company_name: string;
}

export function EmployerQuickActionsClient({
  profile,
}: {
  profile: EmployerProfile;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 mb-10">
      {/* Add Posting — renders the modal button */}
      <div className="group flex-1 min-w-[140px]">
        <PostInternshipButton
          employerProfile={profile}
          trigger={
            <div
              className={cx(
                "h-14 px-6 rounded-2xl flex items-center gap-3 transition-all duration-300 border border-border hover:border-brand/40 hover:shadow-sm hover:bg-surface bg-brand-subtle w-full text-fg",
              )}
            >
              <div className="shrink-0 transition-transform group-hover:scale-110 text-brand">
                <Plus className="w-5 h-5" />
              </div>
              <Typography
                variant="body2"
                weight="bold"
                className="text-fg group-hover:text-brand transition-colors truncate"
              >
                Add Posting
              </Typography>
            </div>
          }
        />
      </div>

      <Link
        href="/dashboard/employer/internships"
        className="group flex-1 min-w-[140px]"
      >
        <div className="h-14 px-6 rounded-2xl flex items-center gap-3 transition-all duration-300 border border-border hover:border-brand/40 hover:shadow-sm hover:bg-surface bg-surface-sunken">
          <div className="shrink-0 transition-transform group-hover:scale-110 text-fg-muted group-hover:text-brand">
            <List className="w-5 h-5" />
          </div>
          <Typography
            variant="body2"
            weight="bold"
            className="text-fg group-hover:text-brand transition-colors truncate"
          >
            My Hub
          </Typography>
        </div>
      </Link>

      <Link
        href="/dashboard/employer/logbook"
        className="group flex-1 min-w-[140px]"
      >
        <div className="h-14 px-6 rounded-2xl flex items-center gap-3 transition-all duration-300 border border-border hover:border-brand/40 hover:shadow-sm hover:bg-surface bg-surface-sunken">
          <div className="shrink-0 transition-transform group-hover:scale-110 text-fg-muted group-hover:text-brand">
            <Edit3 className="w-5 h-5" />
          </div>
          <Typography
            variant="body2"
            weight="bold"
            className="text-fg group-hover:text-brand transition-colors truncate"
          >
            Logbooks
          </Typography>
        </div>
      </Link>
    </div>
  );
}
