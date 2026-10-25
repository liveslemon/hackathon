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
            className="block text-xs md:text-sm font-semibold text-fg mb-1.5 ml-1 select-none"
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
            "w-full py-2.5 px-4 rounded-xl border transition-all duration-200 bg-surface text-fg focus:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base min-h-[100px]",
            error
              ? "border-danger text-danger focus-visible:ring-danger/20 focus-visible:border-danger"
              : "border-border hover:border-border-strong focus-visible:border-brand focus-visible:ring-focus-ring/20",
            "placeholder:text-fg-subtle",
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

Textarea.displayName = "Textarea";
