"use client";
import { useTheme } from "./ThemeProvider";
import { FiSun, FiMoon } from "react-icons/fi";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-pointer ${
        theme === "dark"
          ? "bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/30"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      } ${className}`}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <FiSun className="w-4 h-4 md:w-5 md:h-5" />
      ) : (
        <FiMoon className="w-4 h-4 md:w-5 md:h-5" />
      )}
    </button>
  );
}
