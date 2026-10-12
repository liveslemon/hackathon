import React, { useId } from "react";
import { cx } from "@/utils/cx";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      className,
      id: customId,
      "aria-describedby": customAriaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = customId || (label ? `input-${generatedId}` : undefined);
    const messageId =
      error || helperText ? `desc-${inputId || generatedId}` : undefined;

    const describedBy =
      [customAriaDescribedBy, messageId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs md:text-sm font-semibold text-fg mb-1.5 ml-1 select-none"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none"
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={cx(
              "w-full py-2.5 rounded-xl border transition-all duration-200 bg-surface text-fg focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed",
              leftIcon ? "pl-10" : "px-4",
              rightIcon ? "pr-10" : "px-4",
              error
                ? "border-danger text-danger focus-visible:ring-danger/20 focus-visible:border-danger"
                : "border-border hover:border-border-strong focus-visible:border-brand focus-visible:ring-focus-ring/20",
              "placeholder:text-fg-subtle text-sm md:text-base min-h-[42px]",
              className,
            )}
            {...props}
          />
          {rightIcon && (
            <div
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-fg-subtle"
              aria-hidden="true"
            >
              {rightIcon}
            </div>
          )}
        </div>
        {(error || helperText) && (
          <p
            id={messageId}
            className={cx(
              "mt-1.5 text-xs ml-1",
              error
                ? "text-danger font-medium"
                : "text-fg-muted",
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
