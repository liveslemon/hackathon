import React from "react";
import { cx } from "@/utils/cx";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, helperText, leftIcon, className, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {leftIcon}
          </div>
        )}
        <input
          className={cx(
            "w-full py-2.5 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2",
            leftIcon ? "pl-10 pr-4" : "px-4",
            error
              ? "border-red-500 focus:ring-red-500/20"
              : "border-slate-200 focus:border-brand focus:ring-brand/20",
            "placeholder:text-slate-400 text-slate-900",
            className
          )}
          {...props}
        />
      </div>
      {(error || helperText) && (
        <p className={cx("mt-1.5 text-xs ml-1", error ? "text-red-500" : "text-slate-500")}>
          {error || helperText}
        </p>
      )}
    </div>
  );
};
