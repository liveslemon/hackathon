import React from "react";
import { cx } from "@/utils/cx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, onClick, hoverable, role, tabIndex, onKeyDown, ...props }, ref) => {
    const isClickable = Boolean(onClick);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (onKeyDown) {
        onKeyDown(e);
      }
      if (isClickable && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onClick?.();
      }
    };

    return (
      <div
        ref={ref}
        onClick={onClick}
        onKeyDown={isClickable ? handleKeyDown : onKeyDown}
        role={role || (isClickable ? "button" : undefined)}
        tabIndex={tabIndex ?? (isClickable ? 0 : undefined)}
        className={cx(
          "bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden text-slate-900 dark:text-slate-100",
          hoverable &&
            "transition-all duration-300 hover:shadow-md cursor-pointer hover:border-slate-200 dark:hover:border-slate-700",
          isClickable && "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";

export interface CardSectionProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cx(
        "px-6 py-4 border-b border-slate-100 dark:border-slate-800",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);

CardHeader.displayName = "CardHeader";

export const CardContent = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ children, className, ...props }, ref) => (
    <div ref={ref} className={cx("px-6 py-6", className)} {...props}>
      {children}
    </div>
  ),
);

CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cx(
        "px-6 py-4 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);

CardFooter.displayName = "CardFooter";
