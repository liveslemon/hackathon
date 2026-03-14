import React from "react";
import { cx } from "@/utils/cx";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, error, helperText, className, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">
          {label}
        </label>
      )}
      <textarea
        className={cx(
          "w-full py-2.5 px-4 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2",
          error
            ? "border-red-500 focus:ring-red-500/20"
            : "border-slate-200 focus:border-[#667eea] focus:ring-[#667eea]/20",
          "placeholder:text-slate-400 text-slate-900",
          className
        )}
        {...props}
      />
      {(error || helperText) && (
        <p className={cx("mt-1.5 text-xs ml-1", error ? "text-red-500" : "text-slate-500")}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};
