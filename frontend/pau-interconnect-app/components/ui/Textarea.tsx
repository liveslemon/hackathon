import React, { useId } from "react";
import { cx } from "@/utils/cx";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      helperText,
      className,
      id: customId,
      "aria-describedby": customAriaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const textareaId =
      customId || (label ? `textarea-${generatedId}` : undefined);
    const messageId =
      error || helperText ? `desc-${textareaId || generatedId}` : undefined;

    const describedBy =
      [customAriaDescribedBy, messageId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5 ml-1 select-none"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cx(
            "w-full py-2.5 px-4 rounded-xl border transition-all duration-200 bg-white dark:bg-slate-900 focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base",
            error
              ? "border-red-500 text-red-900 dark:text-red-200 focus-visible:ring-red-500/20 focus-visible:border-red-500"
              : "border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus-visible:border-brand focus-visible:ring-brand/20",
            "placeholder:text-slate-400 dark:placeholder:text-slate-500",
            className,
          )}
          {...props}
        />
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

Textarea.displayName = "Textarea";
