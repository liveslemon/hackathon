import React from "react";
import { cx } from "@/utils/cx";

interface ContainerProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "none";
  className?: string;
}

export const Container: React.FC<ContainerProps> = ({ children, maxWidth = "xl", className }) => {
  const maxWidths = {
    sm: "max-w-screen-sm",
    md: "max-w-screen-md",
    lg: "max-w-screen-lg",
    xl: "max-w-screen-xl",
    "2xl": "max-w-screen-2xl",
    none: "max-w-none",
  };

  return (
    <div className={cx("mx-auto px-4 sm:px-6 lg:px-8 w-full", maxWidths[maxWidth], className)}>
      {children}
    </div>
  );
};
