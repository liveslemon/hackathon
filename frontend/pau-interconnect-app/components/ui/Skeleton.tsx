import React from "react";
import { cx } from "@/utils/cx";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  circle?: boolean;
}

export function Skeleton({ className, circle = false, ...props }: SkeletonProps) {
  return (
    <div
      className={cx(
        "animate-pulse bg-slate-200/60",
        circle ? "rounded-full" : "rounded-xl",
        className
      )}
      {...props}
    />
  );
}
