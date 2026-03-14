import React from "react";
import { cx } from "@/utils/cx";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "success" | "warning" | "error" | "slate";
  size?: "sm" | "md";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "primary", size = "md", className }) => {
  const variants = {
    primary: "bg-[#667eea]/10 text-[#667eea] border-[#667eea]/20",
    secondary: "bg-[#764ba2]/10 text-[#764ba2] border-[#764ba2]/20",
    success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    error: "bg-red-500/10 text-red-600 border-red-500/20",
    slate: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-3 py-1 text-xs",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center justify-center font-bold rounded-full border uppercase tracking-wider",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
};
