import React from "react";
import { cx } from "@/utils/cx";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({ label, error, helperText, options, placeholder, className, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={cx(
            "w-full py-2.5 px-4 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 appearance-none bg-white",
            error
              ? "border-red-500 focus:ring-red-500/20"
              : "border-slate-200 focus:border-brand focus:ring-brand/20",
            "text-slate-900",
            className
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
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {(error || helperText) && (
        <p className={cx("mt-1.5 text-xs ml-1", error ? "text-red-500" : "text-slate-500")}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};
