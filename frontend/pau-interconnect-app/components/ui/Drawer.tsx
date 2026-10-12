"use client";
import React, { useEffect, useRef } from "react";
import { cx } from "@/utils/cx";
import { X } from "lucide-react";
import { Typography } from "./Typography";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  side?: "left" | "right" | "bottom";
  className?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  side = "right",
  className,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sideClasses = {
    right: "inset-y-0 right-0 w-full sm:max-w-md animate-in slide-in-from-right duration-300",
    left: "inset-y-0 left-0 w-full sm:max-w-md animate-in slide-in-from-left duration-300",
    bottom: "inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl animate-in slide-in-from-bottom duration-300",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-overlay backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Content */}
      <div
        ref={drawerRef}
        className={cx(
          "fixed bg-surface-raised border-border text-fg shadow-2xl flex flex-col z-50 overflow-hidden",
          side === "right" && "border-l",
          side === "left" && "border-r",
          side === "bottom" && "border-t",
          sideClasses[side],
          className,
        )}
      >
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-border bg-surface-sunken/40 shrink-0">
          {title ? (
            <Typography variant="h4" weight="bold">
              {title}
            </Typography>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="p-2 rounded-xl text-fg-muted hover:text-fg hover:bg-surface-sunken transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 md:p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
