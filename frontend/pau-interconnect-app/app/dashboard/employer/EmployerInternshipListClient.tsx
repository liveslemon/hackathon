"use client";

import React, { useState, useEffect } from "react";
import { Stack, Typography, Card, CardContent, Badge, Button } from "@/components/ui";
import { FiBriefcase, FiUsers, FiClock } from "react-icons/fi";
import Link from "next/link";
import { cx } from "@/utils/cx";

export default function EmployerInternshipListClient({ 
  initialInternships 
}: { 
  initialInternships: any[] 
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [fieldFilter, setFieldFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Extract unique fields and categories for filter pills
  const fields = ["All", ...Array.from(new Set(initialInternships.map(j => j.field)))];
  const categories = ["All", ...Array.from(new Set(initialInternships.map(j => j.category)))];

  useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
       const query = (e as CustomEvent).detail;
       setSearchQuery(query || "");
       setCurrentPage(1); // Reset to first page on search
    };
    window.addEventListener("dashboardSearch", handleGlobalSearch);
    return () => window.removeEventListener("dashboardSearch", handleGlobalSearch);
  }, []);

  const filteredJobs = initialInternships.filter(job => {
    const matchesSearch = `${job.role} ${job.field} ${job.category}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesField = fieldFilter === "All" || job.field === fieldFilter;
    const matchesCategory = categoryFilter === "All" || job.category === categoryFilter;
    return matchesSearch && matchesField && matchesCategory;
  });

  // Pagination slicing
  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedJobs = filteredJobs.slice(startIndex, startIndex + itemsPerPage);

  const handleFilterChange = (type: "field" | "category", val: string) => {
    if (type === "field") setFieldFilter(val);
    else setCategoryFilter(val);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-8">
      {/* 1. Filter Bar */}
      <div className="space-y-6 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div>
          <Typography variant="subtitle2" weight="bold" className="text-slate-400 uppercase tracking-widest text-[10px] mb-3 ml-1">Filter by Field</Typography>
          <div className="flex flex-wrap gap-2">
            {fields.map(f => (
              <button
                key={f}
                onClick={() => handleFilterChange("field", f)}
                className={cx(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                  fieldFilter === f 
                    ? "bg-brand border-brand text-white shadow-lg shadow-brand/20" 
                    : "bg-slate-50 border-slate-100 text-slate-500 hover:border-brand/30 hover:bg-white"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Typography variant="subtitle2" weight="bold" className="text-slate-400 uppercase tracking-widest text-[10px] mb-3 ml-1">Filter by Category</Typography>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => handleFilterChange("category", c)}
                className={cx(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                  categoryFilter === c 
                    ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20" 
                    : "bg-slate-50 border-slate-100 text-slate-500 hover:border-brand/30 hover:bg-white"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Results Count */}
      <div className="px-2 flex justify-between items-center">
        <Typography variant="body2" color="muted">
          Showing <span className="text-slate-900 font-bold">{Math.min(filteredJobs.length, startIndex + 1)}-{Math.min(filteredJobs.length, startIndex + itemsPerPage)}</span> of {filteredJobs.length} roles
        </Typography>
        {(fieldFilter !== "All" || categoryFilter !== "All" || searchQuery) && (
          <button 
            onClick={() => { setFieldFilter("All"); setCategoryFilter("All"); }}
            className="text-[11px] font-bold text-brand uppercase tracking-wider hover:underline"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* 3. Internship Cards */}
      {paginatedJobs.length === 0 ? (
        <div className="p-16 text-center bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
           <Typography variant="h6" weight="bold" className="text-slate-900 mb-2">No postings match your selection</Typography>
           <Typography color="muted">Try adjusting your filters or search query.</Typography>
        </div>
      ) : (
        <Stack spacing={4}>
          {paginatedJobs.map((job: any) => (
            <Card key={job.id} className="group p-2 hover:border-brand hover:shadow-xl hover:shadow-indigo-100 transition-all duration-300 border-slate-100">
              <Link href={`/dashboard/employer/internships/${job.id}`}>
                <CardContent className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 gap-6">
                  <div>
                    <Typography variant="h4" weight="bold" className="group-hover:text-brand transition-colors mb-2">{job.role}</Typography>
                    <Stack direction="row" spacing={3} align="center" className="flex-wrap gap-y-2">
                      <Badge variant="primary" size="sm">{job.field}</Badge>
                      <Badge variant="slate" size="sm">{job.category}</Badge>
                      {job.deadline && (
                        <Stack direction="row" spacing={1} align="center" className="text-slate-400">
                          <FiClock className="w-3.5 h-3.5" />
                          <Typography variant="caption">{new Date(job.deadline).toLocaleDateString()}</Typography>
                        </Stack>
                      )}
                    </Stack>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full md:w-auto"
                    rightIcon={<FiUsers className="w-4 h-4 ml-1" />}
                  >
                    Review {job.applied_internships?.[0]?.count || 0} Applicants
                  </Button>
                </CardContent>
              </Link>
            </Card>
          ))}
        </Stack>
      )}

      {/* 4. Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="text-slate-500 hover:text-brand disabled:opacity-30"
          >
            Previous
          </Button>
          <div className="flex gap-2">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={cx(
                  "w-8 h-8 rounded-xl text-xs font-bold transition-all",
                  currentPage === i + 1 ? "bg-brand text-white shadow-md" : "text-slate-400 hover:bg-slate-100"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="text-slate-500 hover:text-brand disabled:opacity-30"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
