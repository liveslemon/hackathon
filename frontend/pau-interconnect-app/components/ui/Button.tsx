import React from "react";
import Link from "next/link";
import { cx } from "@/utils/cx";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "solid" | "outline" | "ghost" | "link" | "subtle";
  colorType?: "primary" | "secondary" | "danger" | "success";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
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
      "inline-flex items-center justify-center font-semibold transition-all duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus-ring disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed";

    const sizes = {
      xs: "px-2.5 py-1 text-xs rounded-lg gap-1 min-h-[32px]",
      sm: "px-3 py-1.5 text-xs md:text-sm rounded-xl gap-1.5 min-h-[36px]",
      md: "px-4 py-2 text-sm md:text-base rounded-xl gap-2 min-h-[42px]",
      lg: "px-6 py-2.5 text-base md:text-lg rounded-2xl gap-2.5 min-h-[48px]",
      xl: "px-8 py-3.5 text-lg md:text-xl rounded-2xl gap-3 min-h-[56px]",
    };

    const variants = {
      solid: {
        primary:
          "bg-brand text-brand-fg hover:bg-brand-hover shadow-sm active:translate-y-[0.5px]",
        secondary:
          "bg-brand-secondary text-white hover:bg-brand-secondary-hover shadow-sm active:translate-y-[0.5px]",
        danger:
          "bg-danger text-on-danger hover:opacity-90 shadow-sm active:translate-y-[0.5px]",
        success:
          "bg-success text-on-success hover:opacity-90 shadow-sm active:translate-y-[0.5px]",
      },
      outline: {
        primary:
          "border border-border text-fg hover:bg-surface-sunken hover:border-border-strong active:translate-y-[0.5px]",
        secondary:
          "border border-brand-secondary text-brand-secondary hover:bg-brand-secondary-subtle active:translate-y-[0.5px]",
        danger:
          "border border-danger text-danger hover:bg-danger-subtle active:translate-y-[0.5px]",
        success:
          "border border-success text-success hover:bg-success-subtle active:translate-y-[0.5px]",
      },
      subtle: {
        primary:
          "bg-brand-subtle text-brand hover:opacity-90 active:translate-y-[0.5px]",
        secondary:
          "bg-brand-secondary-subtle text-brand-secondary hover:opacity-90 active:translate-y-[0.5px]",
        danger:
          "bg-danger-subtle text-danger hover:opacity-90 active:translate-y-[0.5px]",
        success:
          "bg-success-subtle text-success hover:opacity-90 active:translate-y-[0.5px]",
      },
      ghost: {
        primary:
          "text-fg-muted hover:text-fg hover:bg-surface-sunken active:translate-y-[0.5px]",
        secondary:
          "text-brand-secondary hover:bg-brand-secondary-subtle active:translate-y-[0.5px]",
        danger:
          "text-danger hover:bg-danger-subtle active:translate-y-[0.5px]",
        success:
          "text-success hover:bg-success-subtle active:translate-y-[0.5px]",
      },
      link: {
        primary: "text-brand hover:underline p-0! h-auto min-h-0",
        secondary: "text-brand-secondary hover:underline p-0! h-auto min-h-0",
        danger: "text-danger hover:underline p-0! h-auto min-h-0",
        success: "text-success hover:underline p-0! h-auto min-h-0",
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
