import React from "react";
import { cx } from "@/utils/cx";

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  direction?: "row" | "col";
  spacing?: number;
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between";
  className?: string;
}

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  (
    {
      children,
      direction = "col",
      spacing = 4,
      align = "stretch",
      justify = "start",
      className,
      ...props
    },
    ref,
  ) => {
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
      "gap-0",
      "gap-1",
      "gap-2",
      "gap-3",
      "gap-4",
      "gap-5",
      "gap-6",
      "gap-8",
      "gap-10",
      "gap-12",
    ];
    const gapClass = gaps[spacing] || `gap-${spacing}`;

    return (
      <div
        ref={ref}
        className={cx(
          "flex",
          directions[direction],
          alignments[align],
          justifications[justify],
          gapClass,
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Stack.displayName = "Stack";
