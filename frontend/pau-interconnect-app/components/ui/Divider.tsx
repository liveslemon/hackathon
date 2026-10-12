import React from "react";
import { cx } from "@/utils/cx";

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export const Divider = React.forwardRef<HTMLDivElement, DividerProps>(
  ({ className, orientation = "horizontal", ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="separator"
        aria-orientation={orientation}
        className={cx(
          "bg-border shrink-0",
          orientation === "horizontal" ? "h-[1px] w-full" : "w-[1px] h-full",
          className,
        )}
        {...props}
      />
    );
  },
);

Divider.displayName = "Divider";
