import React from "react";
import { cx } from "@/utils/cx";
import { Typography } from "./Typography";

export interface StatCardProps {
  label: string;
  value: string | number;
  change?: {
    value: string;
    trend: "up" | "down" | "neutral";
  };
  icon?: React.ReactNode;
  description?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  icon,
  description,
  className,
}) => {
  return (
    <div
      className={cx(
        "bg-surface rounded-2xl p-5 md:p-6 border border-border shadow-sm flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:border-border-strong",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 mb-3">
        <Typography variant="body2" color="muted" weight="medium">
          {label}
        </Typography>
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-brand-subtle text-brand flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-extrabold text-fg tracking-tight">
            {value}
          </span>
          {change && (
            <span
              className={cx(
                "text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center",
                change.trend === "up" && "bg-success-subtle text-success-fg",
                change.trend === "down" && "bg-danger-subtle text-danger-fg",
                change.trend === "neutral" && "bg-surface-sunken text-fg-muted",
              )}
            >
              {change.trend === "up" && "↑ "}
              {change.trend === "down" && "↓ "}
              {change.value}
            </span>
          )}
        </div>
        {description && (
          <Typography variant="caption" color="muted" className="mt-1 normal-case">
            {description}
          </Typography>
        )}
      </div>
    </div>
  );
};
