import React from "react";
import { cx } from "@/utils/cx";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  FileCheck,
  Send,
  Loader2,
  HelpCircle,
} from "lucide-react";

export type ApplicationStage =
  | "applied"
  | "reviewed"
  | "interview"
  | "shortlisted"
  | "offered"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "pending";

export type LogbookStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "needs_revision";

export type InternshipStatus = "open" | "closed" | "draft" | "archived";

export type StatusPillStatus =
  | ApplicationStage
  | LogbookStatus
  | InternshipStatus
  | "active"
  | "completed"
  | string;

export interface StatusPillProps {
  status: StatusPillStatus;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

interface StatusStyleConfig {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const STATUS_STYLE_MAP: Record<string, StatusStyleConfig> = {
  // Positive / Successful
  accepted: {
    label: "Accepted",
    bgClass: "bg-success-subtle",
    textClass: "text-success-fg",
    borderClass: "border-success/30",
    icon: CheckCircle2,
  },
  offered: {
    label: "Offered",
    bgClass: "bg-success-subtle",
    textClass: "text-success-fg",
    borderClass: "border-success/30",
    icon: CheckCircle2,
  },
  approved: {
    label: "Approved",
    bgClass: "bg-success-subtle",
    textClass: "text-success-fg",
    borderClass: "border-success/30",
    icon: FileCheck,
  },
  completed: {
    label: "Completed",
    bgClass: "bg-success-subtle",
    textClass: "text-success-fg",
    borderClass: "border-success/30",
    icon: CheckCircle2,
  },
  open: {
    label: "Open",
    bgClass: "bg-success-subtle",
    textClass: "text-success-fg",
    borderClass: "border-success/30",
    icon: CheckCircle2,
  },
  active: {
    label: "Active",
    bgClass: "bg-success-subtle",
    textClass: "text-success-fg",
    borderClass: "border-success/30",
    icon: CheckCircle2,
  },

  // Active progression / Info
  interview: {
    label: "Interview",
    bgClass: "bg-info-subtle",
    textClass: "text-info-fg",
    borderClass: "border-info/30",
    icon: Clock,
  },
  shortlisted: {
    label: "Shortlisted",
    bgClass: "bg-brand-secondary-subtle",
    textClass: "text-brand-secondary",
    borderClass: "border-brand-secondary/30",
    icon: CheckCircle2,
  },
  reviewed: {
    label: "Reviewed",
    bgClass: "bg-brand-subtle",
    textClass: "text-brand",
    borderClass: "border-brand/30",
    icon: Clock,
  },
  applied: {
    label: "Applied",
    bgClass: "bg-info-subtle",
    textClass: "text-info-fg",
    borderClass: "border-info/30",
    icon: Send,
  },
  submitted: {
    label: "Submitted",
    bgClass: "bg-info-subtle",
    textClass: "text-info-fg",
    borderClass: "border-info/30",
    icon: Send,
  },

  // Pending / In-progress Warning
  pending: {
    label: "Pending",
    bgClass: "bg-warning-subtle",
    textClass: "text-warning-fg",
    borderClass: "border-warning/30",
    icon: Loader2,
  },
  draft: {
    label: "Draft",
    bgClass: "bg-surface-sunken",
    textClass: "text-fg-muted",
    borderClass: "border-border",
    icon: Clock,
  },
  needs_revision: {
    label: "Needs Revision",
    bgClass: "bg-warning-subtle",
    textClass: "text-warning-fg",
    borderClass: "border-warning/30",
    icon: AlertCircle,
  },

  // Negative / Danger / Inactive
  rejected: {
    label: "Rejected",
    bgClass: "bg-danger-subtle",
    textClass: "text-danger-fg",
    borderClass: "border-danger/30",
    icon: XCircle,
  },
  withdrawn: {
    label: "Withdrawn",
    bgClass: "bg-surface-sunken",
    textClass: "text-fg-subtle",
    borderClass: "border-border",
    icon: XCircle,
  },
  closed: {
    label: "Closed",
    bgClass: "bg-surface-sunken",
    textClass: "text-fg-subtle",
    borderClass: "border-border",
    icon: XCircle,
  },
  archived: {
    label: "Archived",
    bgClass: "bg-surface-sunken",
    textClass: "text-fg-subtle",
    borderClass: "border-border",
    icon: Clock,
  },
};

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  size = "md",
  showIcon = true,
  className,
}) => {
  const normalizedKey = String(status).toLowerCase().trim().replace(/[\s-]+/g, "_");
  const config: StatusStyleConfig = STATUS_STYLE_MAP[normalizedKey] || {
    label: String(status),
    bgClass: "bg-surface-sunken",
    textClass: "text-fg-muted",
    borderClass: "border-border",
    icon: HelpCircle,
  };

  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[10px] gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center font-semibold rounded-full border tracking-tight select-none shrink-0 transition-colors",
        config.bgClass,
        config.textClass,
        config.borderClass,
        sizeClasses[size],
        className,
      )}
    >
      {showIcon && <Icon className={cx("shrink-0", iconSizes[size])} />}
      <span>{config.label}</span>
    </span>
  );
};
