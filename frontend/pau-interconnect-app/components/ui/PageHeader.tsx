import React from "react";
import { cx } from "@/utils/cx";
import { Typography } from "./Typography";

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  actions,
  breadcrumbs,
  className,
}) => {
  return (
    <div className={cx("mb-6 md:mb-8 flex flex-col gap-3", className)}>
      {breadcrumbs && <div className="text-xs text-fg-muted">{breadcrumbs}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <Typography variant="h2" weight="bold" className="tracking-tight">
              {title}
            </Typography>
            {badge}
          </div>
          {description && (
            <Typography variant="body2" color="muted" className="mt-1 max-w-2xl">
              {description}
            </Typography>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
