import React from "react";
import { cx } from "@/utils/cx";

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  variant?: "brand" | "success" | "warning" | "danger" | "gradient";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = "brand",
  size = "md",
  showLabel = false,
  className,
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  const variantFills = {
    brand: "bg-brand",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    gradient: "bg-gradient-to-r from-brand to-brand-secondary",
  };

  return (
    <div className={cx("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-semibold text-fg-muted mb-1.5">
          <span>Progress</span>
          <span>{percentage}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label="Progress bar"
        className={cx(
          "w-full rounded-full bg-surface-sunken overflow-hidden border border-border/50",
          sizeClasses[size],
        )}
      >
        <div
          className={cx(
            "h-full rounded-full transition-all duration-500 ease-out",
            variantFills[variant],
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export interface ProgressRingProps {
  value: number; // 0 to 100
  size?: number; // diameter in px
  strokeWidth?: number;
  variant?: "brand" | "success" | "warning" | "danger";
  children?: React.ReactNode;
  className?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size = 64,
  strokeWidth = 6,
  variant = "brand",
  children,
  className,
}) => {
  const percentage = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const strokeColors = {
    brand: "var(--brand)",
    success: "var(--status-success)",
    warning: "var(--status-warning)",
    danger: "var(--status-danger)",
  };

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cx("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-surface-sunken"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColors[variant]}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-fg">
          {children}
        </div>
      )}
    </div>
  );
};
