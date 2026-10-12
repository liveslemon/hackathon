"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FiSearch, FiX, FiBriefcase, FiArrowRight } from "react-icons/fi";
import { Typography, Stack, Badge } from "@/components/ui";
import { authenticatedFetch } from "@/lib/api";
import { supabase } from "@/lib/supabaseClient";

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
      // Fallback for non-admin students: search public internships and employers via Supabase
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
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, performSearch]);

  const flattenedItems = useMemo<FlattenedItem[]>(() => {
    if (!results) return [];
    const items: FlattenedItem[] = [];

    (results.students || []).forEach((s) => {
      items.push({
        id: s.id,
        type: "student",
        title: s.full_name || "Unnamed Student",
        subtitle: s.course || "Student",
        url: `/dashboard/admin/users/${s.id}`,
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

    (results.internships || []).forEach((j) => {
      items.push({
        id: j.id,
        type: "internship",
        title: j.role || "Internship",
        subtitle: j.company || "Company",
        url: `/internships/${j.id}`,
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
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 backdrop-blur-md bg-slate-900/40 animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-top-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Container */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-4">
          <FiSearch className="w-6 h-6 text-indigo-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search for students, companies, or internships..."
            className="flex-1 bg-transparent border-none outline-none text-xl font-medium text-slate-800 placeholder:text-slate-400"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              <Typography variant="body2" color="muted" className="mt-4">
                Searching platform data...
              </Typography>
            </div>
          ) : !query || query.length < 2 ? (
            <div className="p-12 text-center opacity-50">
              <FiSearch className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <Typography variant="body1" weight="medium">
                Enter at least 2 characters to search
              </Typography>
              <Typography
                variant="caption"
                color="muted"
                className="mt-2 flex items-center justify-center gap-1"
              >
                Tip: Press{" "}
                <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 text-[10px] font-bold">
                  ESC
                </span>{" "}
                to close
              </Typography>
            </div>
          ) : !hasResults ? (
            <div className="p-12 text-center">
              <Typography variant="body1" color="muted">
                No results found for &quot;{query}&quot;
              </Typography>
            </div>
          ) : (
            <div className="p-2 space-y-6">
              {/* Students Section */}
              {(results?.students || []).length > 0 && (
                <div className="space-y-2">
                  <div className="px-4 py-1 flex items-center justify-between">
                    <Typography
                      variant="caption"
                      weight="extrabold"
                      color="muted"
                      className="uppercase tracking-widest"
                    >
                      Students
                    </Typography>
                    <Badge variant="emerald" size="sm">
                      {(results?.students || []).length}
                    </Badge>
                  </div>
                  {(results?.students || []).map((stu) => {
                    const itemIndex = flattenedItems.findIndex(
                      (item) => item.id === stu.id && item.type === "student",
                    );
                    const isSelected = itemIndex === selectedIndex;
                    return (
                      <div
                        key={stu.id}
                        onClick={() =>
                          handleNavigate(`/dashboard/admin/users/${stu.id}`)
                        }
                        className={`p-4 rounded-2xl transition-colors cursor-pointer group flex items-center justify-between ${
                          isSelected ? "bg-indigo-50/70" : "hover:bg-slate-50"
                        }`}
                      >
                        <Stack direction="row" spacing={4} align="center">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                            {stu.full_name?.[0] || "S"}
                          </div>
                          <div>
                            <Typography weight="bold">
                              {stu.full_name || "Unnamed Student"}
                            </Typography>
                            <Typography variant="caption" color="muted">
                              {stu.course || "General Studies"}
                            </Typography>
                          </div>
                        </Stack>
                        <FiArrowRight
                          className={`w-4 h-4 transition-all ${
                            isSelected
                              ? "text-indigo-600 translate-x-1"
                              : "text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Employers Section */}
              {(results?.employers || []).length > 0 && (
                <div className="space-y-2">
                  <div className="px-4 py-1 flex items-center justify-between">
                    <Typography
                      variant="caption"
                      weight="extrabold"
                      color="muted"
                      className="uppercase tracking-widest"
                    >
                      Companies
                    </Typography>
                    <Badge variant="indigo" size="sm">
                      {(results?.employers || []).length}
                    </Badge>
                  </div>
                  {(results?.employers || []).map((emp) => {
                    const itemIndex = flattenedItems.findIndex(
                      (item) => item.id === emp.id && item.type === "employer",
                    );
                    const isSelected = itemIndex === selectedIndex;
                    return (
                      <div
                        key={emp.id}
                        onClick={() => handleNavigate(`/companies/${emp.id}`)}
                        className={`p-4 rounded-2xl transition-colors cursor-pointer group flex items-center justify-between ${
                          isSelected ? "bg-indigo-50/70" : "hover:bg-slate-50"
                        }`}
                      >
                        <Stack direction="row" spacing={4} align="center">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                            {emp.company_name?.[0] || emp.full_name?.[0] || "C"}
                          </div>
                          <div>
                            <Typography weight="bold">
                              {emp.company_name || emp.full_name || "Unnamed Company"}
                            </Typography>
                            <Typography variant="caption" color="muted">
                              {emp.full_name || "Contact Rep"}
                            </Typography>
                          </div>
                        </Stack>
                        <FiArrowRight
                          className={`w-4 h-4 transition-all ${
                            isSelected
                              ? "text-indigo-600 translate-x-1"
                              : "text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Internships Section */}
              {(results?.internships || []).length > 0 && (
                <div className="space-y-2">
                  <div className="px-4 py-1 flex items-center justify-between">
                    <Typography
                      variant="caption"
                      weight="extrabold"
                      color="muted"
                      className="uppercase tracking-widest"
                    >
                      Internships
                    </Typography>
                    <Badge variant="pink" size="sm">
                      {(results?.internships || []).length}
                    </Badge>
                  </div>
                  {(results?.internships || []).map((job) => {
                    const itemIndex = flattenedItems.findIndex(
                      (item) => item.id === job.id && item.type === "internship",
                    );
                    const isSelected = itemIndex === selectedIndex;
                    return (
                      <div
                        key={job.id}
                        onClick={() => handleNavigate(`/internships/${job.id}`)}
                        className={`p-4 rounded-2xl transition-colors cursor-pointer group flex items-center justify-between ${
                          isSelected ? "bg-indigo-50/70" : "hover:bg-slate-50"
                        }`}
                      >
                        <Stack direction="row" spacing={4} align="center">
                          <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center">
                            <FiBriefcase className="w-5 h-5" />
                          </div>
                          <div>
                            <Typography weight="bold">
                              {job.role || "Untitled Role"}
                            </Typography>
                            <Typography variant="caption" color="muted">
                              {job.company || "Unknown Company"}
                            </Typography>
                          </div>
                        </Stack>
                        <FiArrowRight
                          className={`w-4 h-4 transition-all ${
                            isSelected
                              ? "text-indigo-600 translate-x-1"
                              : "text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1"
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between px-6">
          <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <span className="px-1 py-0.5 bg-white rounded border border-slate-200">
                ↑↓
              </span>{" "}
              Navigate
            </span>
            <span className="flex items-center gap-1.5">
              <span className="px-1 py-0.5 bg-white rounded border border-slate-200">
                Enter
              </span>{" "}
              Select
            </span>
          </div>
        </div>
      </div>

      {/* Click outside to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose}></div>
    </div>
  );
}
