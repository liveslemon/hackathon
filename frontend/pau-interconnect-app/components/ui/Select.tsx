import React, { useId } from "react";
import { cx } from "@/utils/cx";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder,
      className,
      id: customId,
      "aria-describedby": customAriaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = customId || (label ? `select-${generatedId}` : undefined);
    const messageId =
      error || helperText ? `desc-${selectId || generatedId}` : undefined;

    const describedBy =
      [customAriaDescribedBy, messageId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs md:text-sm font-semibold text-fg mb-1.5 ml-1 select-none"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={cx(
              "w-full py-2.5 px-4 pr-10 rounded-xl border transition-all duration-200 appearance-none bg-surface text-fg focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base min-h-[42px]",
              error
                ? "border-danger text-danger focus-visible:ring-danger/20 focus-visible:border-danger"
                : "border-border hover:border-border-strong focus-visible:border-brand focus-visible:ring-focus-ring/20",
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled hidden className="bg-surface text-fg-muted">
                {placeholder}
              </option>
            )}
            {(options || []).map((option) => (
              <option key={option.value} value={option.value} className="bg-surface text-fg py-2">
                {option.label}
              </option>
            ))}
          </select>
          <div
            className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-fg-subtle"
            aria-hidden="true"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
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

Select.displayName = "Select";
