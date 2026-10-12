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
            className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5 ml-1 select-none"
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
              "w-full py-2.5 px-4 pr-10 rounded-xl border transition-all duration-200 appearance-none bg-white dark:bg-slate-900 focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base",
              error
                ? "border-red-500 text-red-900 dark:text-red-200 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                : "border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus-visible:border-brand focus-visible:ring-brand/20",
              className,
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled hidden>
                {placeholder}
              </option>
            )}
            {(options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div
            className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500"
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
                ? "text-red-600 dark:text-red-400 font-medium"
                : "text-slate-500 dark:text-slate-400",
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
