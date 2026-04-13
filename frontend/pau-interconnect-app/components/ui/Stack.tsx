import React from "react";
import { cx } from "@/utils/cx";

interface StackProps {
  children: React.ReactNode;
  direction?: "row" | "col";
  spacing?: number;
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between";
  className?: string;
}

export const Stack: React.FC<StackProps> = ({
  children,
  direction = "col",
  spacing = 4,
  align = "stretch",
  justify = "start",
  className,
}) => {
  const directions = {
    row: "flex-row",
    col: "flex-col",
  };

  const alignments = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
    baseline: "items-baseline",
  };

  const justifications = {
    start: "justify-start",
    center: "justify-center",
    end: "justify-end",
    between: "justify-between",
  };

  const gaps = [
    "gap-0", "gap-1", "gap-2", "gap-3", "gap-4", "gap-5", "gap-6", "gap-8", "gap-10", "gap-12"
  ];
  const gapClass = gaps[spacing] || `gap-${spacing}`;

  return (
    <div
      className={cx(
        "flex",
        directions[direction],
        alignments[align],
        justifications[justify],
        gapClass,
        className
      )}
    >
      {children}
    </div>
  );
};
