import React from "react";
import { cx } from "@/utils/cx";
import { Typography } from "./Typography";
import { Button } from "./Button";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}) => {
  return (
    <div
      className={cx(
        "flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-3xl border border-dashed border-border bg-surface/50",
        className,
      )}
    >
      {icon && (
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-brand-subtle text-brand flex items-center justify-center mb-5 shrink-0 shadow-sm">
          {icon}
        </div>
      )}
      <Typography variant="h4" weight="bold" className="mb-2">
        {title}
      </Typography>
      {description && (
        <Typography
          variant="body2"
          color="muted"
          className="max-w-md mb-6 leading-relaxed"
        >
          {description}
        </Typography>
      )}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              href={action.href}
              variant="solid"
              colorType="primary"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              href={secondaryAction.href}
              variant="outline"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
