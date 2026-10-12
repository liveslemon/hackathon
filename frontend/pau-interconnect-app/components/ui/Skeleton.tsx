import React from "react";
import { cx } from "@/utils/cx";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  circle?: boolean;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, circle = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cx(
          "animate-pulse bg-surface-sunken/80 border border-border/40",
          circle ? "rounded-full" : "rounded-xl",
          className,
        )}
        {...props}
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
  },
);

Skeleton.displayName = "Skeleton";
