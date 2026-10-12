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
    | "slate"
    | "emerald"
    | "indigo"
    | "pink";
  size?: "sm" | "md";
  className?: string;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ children, variant = "primary", size = "md", className, ...props }, ref) => {
    const variants = {
      primary:
        "bg-brand/10 text-brand border-brand/20 dark:bg-brand/20 dark:text-brand-light dark:border-brand/30",
      secondary:
        "bg-brand-secondary/10 text-brand-secondary border-brand-secondary/20 dark:bg-brand-secondary/20 dark:border-brand-secondary/30",
      success:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      warning:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      error:
        "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      slate:
        "bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20 dark:border-slate-600/30",
      emerald:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      indigo:
        "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      pink:
        "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    };

    const sizes = {
      sm: "px-2 py-0.5 text-[10px]",
      md: "px-3 py-1 text-xs",
    };

    return (
      <span
        ref={ref}
        className={cx(
          "inline-flex items-center justify-center font-semibold rounded-lg border text-[10px] tracking-tight shrink-0",
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
