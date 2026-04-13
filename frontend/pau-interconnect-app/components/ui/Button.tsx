import React from "react";
import Link from "next/link";
import { cx } from "@/utils/cx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement | HTMLLabelElement> {
  variant?: "solid" | "outline" | "ghost" | "link";
  colorType?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  href?: string;
  as?: React.ElementType;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "solid",
  colorType = "primary",
  size = "md",
  isLoading,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  href,
  as: Component = "button",
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer";
  
  const sizes = {
    sm: "px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm",
    md: "px-4 py-2 text-sm md:px-6 md:py-2.5 md:text-base",
    lg: "px-6 py-2.5 text-base md:px-8 md:py-3 md:text-lg",
  };

  const variants = {
    solid: {
      primary: "bg-brand text-white hover:bg-brand-dark shadow-sm shadow-brand/20",
      secondary: "bg-brand-secondary text-white hover:bg-brand-secondary-dark shadow-sm shadow-brand-secondary/20",
      danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-100",
    },
    outline: {
      primary: "border-2 border-brand text-brand hover:bg-brand/5",
      secondary: "border-2 border-brand-secondary text-brand-secondary hover:bg-brand-secondary/5",
      danger: "border-2 border-red-500 text-red-500 hover:bg-red-50/50",
    },
    ghost: {
      primary: "text-brand hover:bg-brand/5",
      secondary: "text-brand-secondary hover:bg-brand-secondary/5",
      danger: "text-red-500 hover:bg-red-50",
    },
    link: {
      primary: "text-brand hover:underline p-0!",
      secondary: "text-brand-secondary hover:underline p-0!",
      danger: "text-red-500 hover:underline p-0!",
    },
  };

  const content = (
    <>
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        <>
          {leftIcon && <span className="mr-2">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="ml-2">{rightIcon}</span>}
        </>
      )}
    </>
  );

  const combinedClassName = cx(baseStyles, sizes[size], variants[variant][colorType], className);

  if (href) {
    return (
      <Link href={href} className={combinedClassName}>
        {content}
      </Link>
    );
  }

  // Use the dynamic component but handle intrinsic props correctly
  const elementProps = {
    className: combinedClassName,
    disabled: disabled || isLoading,
    ...props
  } as any;

  return (
    <Component {...elementProps}>
      {content}
    </Component>
  );
};
