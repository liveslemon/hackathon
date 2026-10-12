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
          "animate-pulse bg-slate-200/80 dark:bg-slate-700/60",
          circle ? "rounded-full" : "rounded-xl",
          className,
        )}
        {...props}
      />
    );
  },
);

Skeleton.displayName = "Skeleton";
