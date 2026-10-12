"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Briefcase, Building2, User, CornerDownLeft } from "lucide-react";
import { Typography, Badge } from "@/components/ui";
import { authenticatedFetch } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";
import { cx } from "@/utils/cx";

type SearchStudent = {
  id: string;
  full_name?: string;
  course?: string;
};

type SearchEmployer = {
  id: string;
  company_name?: string;
  full_name?: string;
};

type SearchInternship = {
  id: string;
  role?: string;
  company?: string;
};

type SearchResults = {
  students?: SearchStudent[];
  employers?: SearchEmployer[];
  internships?: SearchInternship[];
};

interface SearchOverlayProps {
  onClose: () => void;
}

interface FlattenedItem {
  id: string;
  type: "student" | "employer" | "internship";
  title: string;
  subtitle: string;
  url: string;
}

export default function SearchOverlay({ onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const performSearch = useCallback(async () => {
    try {
      setLoading(true);
      const data = await authenticatedFetch<SearchResults>(
        `/admin/search?q=${encodeURIComponent(query)}`,
      );
      setResults(data);
    } catch {
      try {
        const [{ data: jobs }, { data: employers }] = await Promise.all([
          supabase
            .from("internships")
            .select("id, role, company")
            .or(`role.ilike.%${query}%,company.ilike.%${query}%`)
            .limit(8),
          supabase
            .from("profiles")
            .select("id, full_name, company_name")
            .eq("role", "employer")
            .or(`company_name.ilike.%${query}%,full_name.ilike.%${query}%`)
            .limit(8),
        ]);

        setResults({
          internships: jobs || [],
          employers: employers || [],
          students: [],
        });
      } catch {
        setResults({ internships: [], employers: [], students: [] });
      }
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.length >= 2) {
        void performSearch();
      } else {
        setResults(null);
      }
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [query, performSearch]);

  const flattenedItems = useMemo<FlattenedItem[]>(() => {
    if (!results) return [];
    const items: FlattenedItem[] = [];

    (results.internships || []).forEach((j) => {
      items.push({
        id: j.id,
        type: "internship",
        title: j.role || "Internship",
        subtitle: j.company || "Company",
        url: `/internships/${j.id}`,
      });
    });

    (results.employers || []).forEach((e) => {
      items.push({
        id: e.id,
        type: "employer",
        title: e.company_name || e.full_name || "Company",
        subtitle: e.full_name || "Employer",
        url: `/companies/${e.id}`,
      });
    });

    (results.students || []).forEach((s) => {
      items.push({
        id: s.id,
        type: "student",
        title: s.full_name || "Unnamed Student",
        subtitle: s.course || "Student",
        url: `/dashboard/admin/users/${s.id}`,
      });
    });

    return items;
  }, [results]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [flattenedItems]);

  const handleNavigate = useCallback(
    (url: string) => {
      onClose();
      router.push(url);
    },
    [onClose, router],
  );

  useEffect(() => {
    inputRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (flattenedItems.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % flattenedItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? flattenedItems.length - 1 : prev - 1,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selected = flattenedItems[selectedIndex];
        if (selected) {
          handleNavigate(selected.url);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, flattenedItems, selectedIndex, handleNavigate]);

  const hasResults = flattenedItems.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette search"
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 backdrop-blur-md bg-overlay animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-surface-raised rounded-3xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Container */}
        <div className="p-4 md:p-6 border-b border-border flex items-center gap-3 bg-surface-sunken/40">
          <Search className="w-5 h-5 text-brand shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search internships, employers, skills..."
            className="flex-1 bg-transparent border-none outline-none text-base md:text-lg font-medium text-fg placeholder:text-fg-subtle"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1.5 hover:bg-surface-sunken rounded-xl text-fg-subtle hover:text-fg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-fg-subtle bg-surface px-2 py-1 rounded-lg border border-border">
            <span>ESC</span>
          </div>
        </div>

        {/* Results Area */}
        <div className="overflow-y-auto p-3 flex-1">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-brand border-t-transparent" />
              <Typography variant="body2" color="muted" className="mt-3">
                Searching platform data...
              </Typography>
            </div>
          ) : !query || query.length < 2 ? (
            <div className="p-10 text-center text-fg-muted">
              <Search className="w-10 h-10 mx-auto mb-3 text-fg-subtle" />
              <p className="text-sm font-semibold text-fg">Type to start searching</p>
              <p className="text-xs text-fg-muted mt-1">
                Find internships, companies, or student records quickly.
              </p>
            </div>
          ) : !hasResults ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-fg">No results found</p>
              <p className="text-xs text-fg-muted mt-1">
                No matches found for &quot;{query}&quot;.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {flattenedItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                const Icon =
                  item.type === "internship"
                    ? Briefcase
                    : item.type === "employer"
                      ? Building2
                      : User;

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => handleNavigate(item.url)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cx(
                      "flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-150",
                      isSelected
                        ? "bg-brand-subtle text-brand font-semibold"
                        : "hover:bg-surface-sunken text-fg",
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cx(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                          isSelected
                            ? "bg-surface border-brand/20 text-brand"
                            : "bg-surface-sunken border-border text-fg-subtle",
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate leading-tight">
                          {item.title}
                        </p>
                        <p className="text-xs text-fg-muted truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Badge
                        variant={
                          item.type === "internship"
                            ? "primary"
                            : item.type === "employer"
                              ? "secondary"
                              : "neutral"
                        }
                        size="sm"
                      >
                        {item.type}
                      </Badge>
                      {isSelected && (
                        <CornerDownLeft className="w-3.5 h-3.5 text-brand hidden sm:block" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-5 py-3 border-t border-border bg-surface-sunken/40 flex items-center justify-between text-[11px] text-fg-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border font-semibold">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border font-semibold">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border font-semibold">↵</kbd>
              Select
            </span>
          </div>
          <span>PAU InterConnect Quick Search</span>
        </div>
      </div>
    </div>
  );
}
