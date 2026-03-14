import React from "react";
import { cx } from "@/utils/cx";

interface DividerProps {
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export const Divider: React.FC<DividerProps> = ({
  className,
  orientation = "horizontal",
}) => {
  return (
    <div
      className={cx(
        "bg-slate-200 shadow-sm",
        orientation === "horizontal" ? "h-[1px] w-full" : "w-[1px] h-full",
        className
      )}
    />
  );
};
