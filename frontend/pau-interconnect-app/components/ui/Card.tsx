import React from "react";
import { cx } from "@/utils/cx";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, onClick, hoverable }) => {
  return (
    <div
      onClick={onClick}
      className={cx(
        "bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden",
        hoverable && "transition-all duration-300 hover:shadow-md cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cx("px-6 py-4 border-b border-slate-50", className)}>
    {children}
  </div>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cx("px-6 py-6", className)}>
    {children}
  </div>
);

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cx("px-6 py-4 bg-slate-50/50 border-t border-slate-50", className)}>
    {children}
  </div>
);
