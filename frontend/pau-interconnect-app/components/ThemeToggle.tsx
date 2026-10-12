"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "./ThemeProvider";
import { Sun, Moon, Laptop } from "lucide-react";
import { cx } from "@/utils/cx";

export interface ThemeToggleProps {
  className?: string;
  variant?: "icon-cycle" | "dropdown" | "segmented";
}

export function ThemeToggle({
  className = "",
  variant = "dropdown",
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme, mounted } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isDark = mounted && resolvedTheme === "dark";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (variant === "icon-cycle") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={cx(
          "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
          isDark
            ? "bg-surface-sunken text-amber-400 hover:bg-surface-raised"
            : "bg-surface-sunken text-fg-muted hover:text-fg hover:bg-surface-raised",
          className,
        )}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    );
  }

  if (variant === "segmented") {
    return (
      <div
        className={cx(
          "inline-flex p-1 bg-surface-sunken rounded-xl border border-border text-xs font-medium",
          className,
        )}
        role="group"
        aria-label="Theme selection"
      >
        <button
          type="button"
          onClick={() => setTheme("light")}
          aria-pressed={mounted && theme === "light"}
          className={cx(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer",
            mounted && theme === "light"
              ? "bg-surface text-brand shadow-sm font-semibold"
              : "text-fg-muted hover:text-fg",
          )}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          aria-pressed={mounted && theme === "dark"}
          className={cx(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer",
            mounted && theme === "dark"
              ? "bg-surface text-brand shadow-sm font-semibold"
              : "text-fg-muted hover:text-fg",
          )}
        >
          <Moon className="w-3.5 h-3.5" />
          <span>Dark</span>
        </button>
        <button
          type="button"
          onClick={() => setTheme("system")}
          aria-pressed={mounted && theme === "system"}
          className={cx(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer",
            mounted && theme === "system"
              ? "bg-surface text-brand shadow-sm font-semibold"
              : "text-fg-muted hover:text-fg",
          )}
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>System</span>
        </button>
      </div>
    );
  }

  // Default: Dropdown selector (Light / Dark / System)
  const currentIcon = !mounted ? (
    <Sun className="w-4 h-4" />
  ) : theme === "system" ? (
    <Laptop className="w-4 h-4" />
  ) : isDark ? (
    <Moon className="w-4 h-4 text-amber-400" />
  ) : (
    <Sun className="w-4 h-4 text-amber-500" />
  );

  return (
    <div className={cx("relative inline-block", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle color theme"
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer bg-surface-sunken hover:bg-surface-raised border border-border text-fg-muted hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        title="Change theme"
      >
        {currentIcon}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Color themes"
          className="absolute right-0 mt-2 w-36 rounded-2xl bg-surface-raised border border-border shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setTheme("light");
              setIsOpen(false);
            }}
            className={cx(
              "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer text-left",
              mounted && theme === "light"
                ? "bg-brand-subtle text-brand font-semibold"
                : "text-fg hover:bg-surface-sunken",
            )}
          >
            <Sun className="w-4 h-4 text-amber-500" />
            <span>Light</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setTheme("dark");
              setIsOpen(false);
            }}
            className={cx(
              "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer text-left",
              mounted && theme === "dark"
                ? "bg-brand-subtle text-brand font-semibold"
                : "text-fg hover:bg-surface-sunken",
            )}
          >
            <Moon className="w-4 h-4 text-indigo-400" />
            <span>Dark</span>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setTheme("system");
              setIsOpen(false);
            }}
            className={cx(
              "w-full flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-xl transition-colors cursor-pointer text-left",
              mounted && theme === "system"
                ? "bg-brand-subtle text-brand font-semibold"
                : "text-fg hover:bg-surface-sunken",
            )}
          >
            <Laptop className="w-4 h-4 text-fg-subtle" />
            <span>System</span>
          </button>
        </div>
      )}
    </div>
  );
}
export default ThemeToggle;
