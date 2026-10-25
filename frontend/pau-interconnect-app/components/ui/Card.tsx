import React from "react";
import { cx } from "@/utils/cx";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  variant?: "surface" | "raised" | "sunken" | "ghost";
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className,
      onClick,
      hoverable,
      variant = "surface",
      role,
      tabIndex,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
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

    const variantClasses = {
      surface: "bg-surface border border-border shadow-sm text-fg",
      raised: "bg-surface-raised border border-border shadow-md text-fg",
      sunken: "bg-surface-sunken border border-border/60 text-fg",
      ghost: "bg-transparent border border-border/40 text-fg",
    };

    return (
      <div
        ref={ref}
        onClick={onClick}
        onKeyDown={isClickable ? handleKeyDown : onKeyDown}
        role={role || (isClickable ? "button" : undefined)}
        tabIndex={tabIndex ?? (isClickable ? 0 : undefined)}
        className={cx(
          "rounded-2xl transition-all duration-200 overflow-hidden",
          variantClasses[variant],
          hoverable &&
            "hover:shadow-md hover:border-border-strong cursor-pointer hover:-translate-y-0.5",
          isClickable &&
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer",
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
      className={cx("px-6 py-5 border-b border-border", className)}
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
        "px-6 py-4 bg-surface-sunken/60 border-t border-border flex items-center justify-between",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);

CardFooter.displayName = "CardFooter";
