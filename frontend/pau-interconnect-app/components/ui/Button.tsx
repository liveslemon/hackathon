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
  const baseStyles = "inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 focus:outline-none active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";
  
  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-2.5 text-base",
    lg: "px-8 py-3 text-lg",
  };

  const variants = {
    solid: {
      primary: "bg-[#667eea] text-white hover:bg-[#4758a3] shadow-md hover:shadow-lg",
      secondary: "bg-[#764ba2] text-white hover:bg-[#523471] shadow-md hover:shadow-lg",
      danger: "bg-red-500 text-white hover:bg-red-600 shadow-md",
    },
    outline: {
      primary: "border-2 border-[#667eea] text-[#667eea] hover:bg-[#667eea]/5",
      secondary: "border-2 border-[#764ba2] text-[#764ba2] hover:bg-[#764ba2]/5",
      danger: "border-2 border-red-500 text-red-500 hover:bg-red-50/50",
    },
    ghost: {
      primary: "text-[#667eea] hover:bg-[#667eea]/5",
      secondary: "text-[#764ba2] hover:bg-[#764ba2]/5",
      danger: "text-red-500 hover:bg-red-50",
    },
    link: {
      primary: "text-[#667eea] hover:underline p-0!",
      secondary: "text-[#764ba2] hover:underline p-0!",
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
