"use client";
import React from "react";
import { useTheme } from "./ThemeProvider";
import { FiSun, FiMoon } from "react-icons/fi";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, toggleTheme, mounted } = useTheme();

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        isDark
          ? "bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/30"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
      } ${className}`}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <FiSun className="w-4 h-4 md:w-5 md:h-5" />
      ) : (
        <FiMoon className="w-4 h-4 md:w-5 md:h-5" />
      )}
    </button>
  );
}
