"use client";
import React, { useState } from "react";
import { cx } from "@/utils/cx";

export interface TabItem {
  id: string;
  label: string;
  count?: number | string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab?: string;
  onChange?: (tabId: string) => void;
  variant?: "line" | "pills" | "enclosed";
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab: controlledActiveTab,
  onChange,
  variant = "line",
  className,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(
    controlledActiveTab || tabs[0]?.id || "",
  );
  const activeId = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

  const handleTabClick = (id: string, disabled?: boolean) => {
    if (disabled) return;
    setInternalActiveTab(id);
    onChange?.(id);
  };

  if (variant === "pills") {
    return (
      <div
        role="tablist"
        aria-orientation="horizontal"
        className={cx(
          "inline-flex p-1 bg-surface-sunken rounded-2xl border border-border/80 gap-1 overflow-x-auto max-w-full",
          className,
        )}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-disabled={tab.disabled}
              disabled={tab.disabled}
              onClick={() => handleTabClick(tab.id, tab.disabled)}
              className={cx(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-40 disabled:cursor-not-allowed",
                isActive
                  ? "bg-surface text-brand shadow-sm"
                  : "text-fg-muted hover:text-fg hover:bg-surface/50",
              )}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cx(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                    isActive
                      ? "bg-brand-subtle text-brand"
                      : "bg-surface-sunken text-fg-subtle",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default: Line variant
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cx(
        "flex items-center border-b border-border gap-6 overflow-x-auto max-w-full no-scrollbar",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            aria-disabled={tab.disabled}
            disabled={tab.disabled}
            onClick={() => handleTabClick(tab.id, tab.disabled)}
            className={cx(
              "flex items-center gap-2 py-3 px-1 border-b-2 text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring -mb-[1px] disabled:opacity-40 disabled:cursor-not-allowed",
              isActive
                ? "border-brand text-brand"
                : "border-transparent text-fg-muted hover:text-fg hover:border-border-strong",
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cx(
                  "text-[10px] px-2 py-0.5 rounded-full font-bold",
                  isActive
                    ? "bg-brand-subtle text-brand"
                    : "bg-surface-sunken text-fg-subtle",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
