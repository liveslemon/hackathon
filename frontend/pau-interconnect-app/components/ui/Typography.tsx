import React from "react";
import { cx } from "@/utils/cx";

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?:
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "h6"
    | "subtitle1"
    | "subtitle2"
    | "body1"
    | "body2"
    | "caption";
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
  weight?: "normal" | "medium" | "semibold" | "bold" | "extrabold";
  color?: "primary" | "secondary" | "white" | "muted" | "error";
}

const variants = {
  h1: "text-3xl md:text-5xl font-extrabold tracking-tight",
  h2: "text-2xl md:text-4xl font-bold tracking-tight",
  h3: "text-xl md:text-3xl font-semibold",
  h4: "text-lg md:text-2xl font-semibold",
  h5: "text-base md:text-xl font-semibold",
  h6: "text-sm md:text-lg font-semibold",
  subtitle1: "text-base md:text-lg font-medium",
  subtitle2: "text-xs md:text-base font-semibold",
  body1: "text-base leading-relaxed",
  body2: "text-sm leading-relaxed",
  caption: "text-xs uppercase tracking-wider",
};

const weights = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
  extrabold: "font-extrabold",
};

const colors = {
  primary: "text-slate-900 dark:text-slate-100",
  secondary: "text-brand dark:text-brand-light",
  white: "text-white",
  muted: "text-slate-500 dark:text-slate-400",
  error: "text-red-600 dark:text-red-400",
};

export const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  (
    {
      variant = "body1",
      children,
      className,
      as,
      weight,
      color = "primary",
      ...props
    },
    ref,
  ) => {
    const Component =
      as ||
      (variant.startsWith("h")
        ? (variant as React.ElementType)
        : variant === "caption"
          ? "span"
          : "p");

    return (
      <Component
        ref={ref}
        className={cx(
          variants[variant],
          weight && weights[weight],
          colors[color],
          className,
        )}
        {...props}
      >
        {children}
      </Component>
    );
  },
);

Typography.displayName = "Typography";
