"use client";
import React, { useState, useMemo } from "react";
import { cx } from "@/utils/cx";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  renderMobileCard?: (item: T) => React.ReactNode;
  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  keyExtractor,
  emptyMessage = "No data available",
  renderMobileCard,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") setSortDirection("desc");
      else {
        setSortKey(null);
        setSortDirection("asc");
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const comparison = aVal > bVal ? 1 : -1;
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortKey, sortDirection]);

  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-fg-muted border border-border rounded-2xl bg-surface/50">
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cx("w-full space-y-4", className)}>
      {/* Mobile Card Fallback (hidden on md and larger) */}
      {renderMobileCard && (
        <div className="md:hidden space-y-3">
          {sortedData.map((item) => (
            <div key={keyExtractor(item)}>{renderMobileCard(item)}</div>
          ))}
        </div>
      )}

      {/* Responsive Table (hidden on mobile if mobile card fallback is provided) */}
      <div
        className={cx(
          "w-full overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm",
          renderMobileCard ? "hidden md:block" : "block",
        )}
      >
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-sunken/60 text-fg-muted font-semibold text-xs uppercase tracking-wider">
              {columns.map((col) => {
                const isSorted = sortKey === String(col.key);
                return (
                  <th
                    key={String(col.key)}
                    scope="col"
                    className={cx("py-3.5 px-4 md:px-6 select-none", col.className)}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(String(col.key))}
                        className="inline-flex items-center gap-1.5 hover:text-fg font-semibold uppercase tracking-wider text-xs focus:outline-none cursor-pointer"
                      >
                        <span>{col.header}</span>
                        {isSorted ? (
                          sortDirection === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-brand" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-brand" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3.5 h-3.5 text-fg-subtle" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedData.map((item) => (
              <tr
                key={keyExtractor(item)}
                className="hover:bg-surface-sunken/40 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={cx("py-4 px-4 md:px-6 text-fg", col.className)}
                  >
                    {col.render ? col.render(item) : String(item[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
