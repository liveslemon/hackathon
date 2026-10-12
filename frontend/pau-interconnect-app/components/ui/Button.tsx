import React from "react";
import Link from "next/link";
import { cx } from "@/utils/cx";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "solid" | "outline" | "ghost" | "link";
  colorType?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  href?: string;
  as?: React.ElementType;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "solid",
      colorType = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className,
      disabled,
      href,
      type = "button",
      as: Component = "button",
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed";

    const sizes = {
      sm: "px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm gap-1.5",
      md: "px-4 py-2 text-sm md:px-6 md:py-2.5 md:text-base gap-2",
      lg: "px-6 py-2.5 text-base md:px-8 md:py-3 md:text-lg gap-2.5",
    };

    const variants = {
      solid: {
        primary:
          "bg-brand text-white hover:bg-brand-dark shadow-sm shadow-brand/20 active:translate-y-[0.5px]",
        secondary:
          "bg-brand-secondary text-white hover:bg-brand-secondary-dark shadow-sm shadow-brand-secondary/20 active:translate-y-[0.5px]",
        danger:
          "bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-500/20 active:translate-y-[0.5px]",
      },
      outline: {
        primary:
          "border-2 border-brand text-brand hover:bg-brand/5 dark:hover:bg-brand/15 active:translate-y-[0.5px]",
        secondary:
          "border-2 border-brand-secondary text-brand-secondary hover:bg-brand-secondary/5 dark:hover:bg-brand-secondary/15 active:translate-y-[0.5px]",
        danger:
          "border-2 border-red-500 text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/30 active:translate-y-[0.5px]",
      },
      ghost: {
        primary:
          "text-brand hover:bg-brand/5 dark:hover:bg-brand/15 active:translate-y-[0.5px]",
        secondary:
          "text-brand-secondary hover:bg-brand-secondary/5 dark:hover:bg-brand-secondary/15 active:translate-y-[0.5px]",
        danger:
          "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 active:translate-y-[0.5px]",
      },
      link: {
        primary: "text-brand hover:underline p-0! h-auto",
        secondary: "text-brand-secondary hover:underline p-0! h-auto",
        danger: "text-red-600 dark:text-red-400 hover:underline p-0! h-auto",
      },
    };

    const spinner = (
      <svg
        className="animate-spin h-4 w-4 text-current shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );

    const content = (
      <>
        {isLoading && spinner}
        {!isLoading && leftIcon && (
          <span className="shrink-0" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && (
          <span className="shrink-0" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </>
    );

    const combinedClassName = cx(
      baseStyles,
      sizes[size],
      variants[variant][colorType],
      className,
    );

    if (href) {
      return (
        <Link
          href={href}
          className={combinedClassName}
          aria-disabled={disabled || isLoading}
        >
          {content}
        </Link>
      );
    }

    return (
      <Component
        ref={ref}
        type={Component === "button" ? type : undefined}
        className={combinedClassName}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        {...props}
      >
        {content}
      </Component>
    );
  },
);

Button.displayName = "Button";
