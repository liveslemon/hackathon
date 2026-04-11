"use client";

import React, { useState, useEffect, useRef } from "react";
import { FiSearch, FiX, FiUser, FiBriefcase, FiArrowRight, FiCommand } from "react-icons/fi";
import { Typography, Stack, Badge } from "@/components/ui";
import { authenticatedFetch } from "@/lib/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface SearchOverlayProps {
  onClose: () => void;
}

export default function SearchOverlay({ onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.length >= 2) {
        performSearch();
      } else {
        setResults(null);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const performSearch = async () => {
    try {
      setLoading(true);
      const data = await authenticatedFetch(`/admin/search?q=${encodeURIComponent(query)}`);
      setResults(data);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const hasResults = !!results && (
    (results.students?.length || 0) > 0 || 
    (results.employers?.length || 0) > 0 || 
    (results.internships?.length || 0) > 0
  );

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
              <Typography variant="body2" color="muted" className="mt-4">Searching platform data...</Typography>
            </div>
          ) : !query || query.length < 2 ? (
            <div className="p-12 text-center opacity-50">
              <FiSearch className="w-12 h-12 mx-auto mb-4 text-slate-300" />
              <Typography variant="body1" weight="medium">Enter at least 2 characters to search</Typography>
              <Typography variant="caption" color="muted" className="mt-2 flex items-center justify-center gap-1">
                Tip: Press <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 text-[10px] font-bold">ESC</span> to close
              </Typography>
            </div>
          ) : !hasResults ? (
            <div className="p-12 text-center">
              <Typography variant="body1" color="muted">No results found for "{query}"</Typography>
            </div>
          ) : (
            <div className="p-2 space-y-6">
              {/* Students Section */}
              {(results?.students || []).length > 0 && (
                <div className="space-y-2">
                  <div className="px-4 py-1 flex items-center justify-between">
                    <Typography variant="caption" weight="extrabold" color="muted" className="uppercase tracking-widest">Students</Typography>
                    <Badge variant="emerald" size="sm">{(results.students || []).length}</Badge>
                  </div>
                  {(results.students || []).map((stu: any) => (
                    <div key={stu.id} className="p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group flex items-center justify-between">
                      <Stack direction="row" spacing={4} align="center">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                          {stu.full_name?.[0] || "S"}
                        </div>
                        <div>
                          <Typography weight="bold">{stu.full_name || "Unnamed Student"}</Typography>
                          <Typography variant="caption" color="muted">{stu.course || "General Studies"}</Typography>
                        </div>
                      </Stack>
                      <FiArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  ))}
                </div>
              )}

              {/* Employers Section */}
              {(results?.employers || []).length > 0 && (
                <div className="space-y-2">
                  <div className="px-4 py-1 flex items-center justify-between">
                    <Typography variant="caption" weight="extrabold" color="muted" className="uppercase tracking-widest">Companies</Typography>
                    <Badge variant="indigo" size="sm">{(results.employers || []).length}</Badge>
                  </div>
                  {(results.employers || []).map((emp: any) => (
                    <div key={emp.id} className="p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group flex items-center justify-between">
                      <Stack direction="row" spacing={4} align="center">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                          {emp.company_name?.[0] || "C"}
                        </div>
                        <div>
                          <Typography weight="bold">{emp.company_name || "Unnamed Company"}</Typography>
                          <Typography variant="caption" color="muted">{emp.full_name || "Contact Rep"}</Typography>
                        </div>
                      </Stack>
                      <FiArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  ))}
                </div>
              )}

              {/* Internships Section */}
              {(results?.internships || []).length > 0 && (
                <div className="space-y-2">
                  <div className="px-4 py-1 flex items-center justify-between">
                    <Typography variant="caption" weight="extrabold" color="muted" className="uppercase tracking-widest">Internships</Typography>
                    <Badge variant="pink" size="sm">{(results.internships || []).length}</Badge>
                  </div>
                  {(results.internships || []).map((job: any) => (
                    <div key={job.id} className="p-4 hover:bg-slate-50 rounded-2xl transition-colors cursor-pointer group flex items-center justify-between">
                      <Stack direction="row" spacing={4} align="center">
                        <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center">
                          <FiBriefcase className="w-5 h-5" />
                        </div>
                        <div>
                          <Typography weight="bold">{job.role || "Untitled Role"}</Typography>
                          <Typography variant="caption" color="muted">{job.company || "Unknown Company"}</Typography>
                        </div>
                      </Stack>
                      <FiArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between px-6">
           <div className="flex items-center gap-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><span className="px-1 py-0.5 bg-white rounded border border-slate-200">↑↓</span> Navigate</span>
              <span className="flex items-center gap-1.5"><span className="px-1 py-0.5 bg-white rounded border border-slate-200">Enter</span> Select</span>
           </div>
        </div>
      </div>
      
      {/* Click outside to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose}></div>
    </div>
  );
}
