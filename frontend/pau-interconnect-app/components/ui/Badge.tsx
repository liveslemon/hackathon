import React from "react";
import { cx } from "@/utils/cx";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode;
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "error"
    | "info"
    | "slate"
    | "emerald"
    | "indigo"
    | "pink"
    | "neutral";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = "primary", size = "md", className, ...props }, ref) => {
    const variants = {
      primary:
        "bg-brand-subtle text-brand border-brand/20",
      secondary:
        "bg-brand-secondary-subtle text-brand-secondary border-brand-secondary/20",
      success:
        "bg-success-subtle text-success-fg border-success/20",
      warning:
        "bg-warning-subtle text-warning-fg border-warning/20",
      error:
        "bg-danger-subtle text-danger-fg border-danger/20",
      info:
        "bg-info-subtle text-info-fg border-info/20",
      neutral:
        "bg-surface-sunken text-fg-muted border-border",
      slate:
        "bg-surface-sunken text-fg-muted border-border",
      emerald:
        "bg-success-subtle text-success-fg border-success/20",
      indigo:
        "bg-brand-subtle text-brand border-brand/20",
      pink:
        "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    };

    const sizes = {
      sm: "px-2 py-0.5 text-[10px] leading-tight",
      md: "px-2.5 py-1 text-xs leading-tight",
      lg: "px-3 py-1.5 text-xs font-bold leading-tight",
    };

    return (
      <span
        ref={ref}
        className={cx(
          "inline-flex items-center justify-center font-medium rounded-full border tracking-tight shrink-0 select-none",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  },
);

Badge.displayName = "Badge";
