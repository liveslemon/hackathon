"use client";
import React, { useState, useRef, useEffect } from "react";
import { cx } from "@/utils/cx";

export interface DropdownMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

export interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: "left" | "right";
  className?: string;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({
  trigger,
  items,
  align = "right",
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div
      className={cx("relative inline-block", className)}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      <div
        onClick={() => setIsOpen((prev) => !prev)}
        role="button"
        tabIndex={0}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className="cursor-pointer inline-flex"
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={cx(
            "absolute mt-2 min-w-[180px] rounded-2xl bg-surface-raised border border-border shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => {
            if (item.divider) {
              return (
                <div
                  key={item.id}
                  className="my-1 border-t border-border"
                  role="separator"
                />
              );
            }

            return (
              <button
                key={item.id}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) return;
                  item.onClick?.();
                  setIsOpen(false);
                }}
                className={cx(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-xs md:text-sm font-medium rounded-xl transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-40 disabled:cursor-not-allowed",
                  item.danger
                    ? "text-danger hover:bg-danger-subtle"
                    : "text-fg hover:bg-surface-sunken",
                )}
              >
                {item.icon && (
                  <span className="shrink-0 text-fg-subtle">{item.icon}</span>
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
