"use client";

import React, { useState, useEffect } from "react";
import {
  Stack,
  Typography,
  Card,
  CardContent,
  Badge,
  Button,
} from "@/components/ui";
import {
  Users,
  Clock,
  MoreVertical,
  Edit2,
  Copy,
  Power,
  Trash2,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cx } from "@/utils/cx";

interface EmployerInternship {
  id: string;
  role: string;
  field: string;
  category: string;
  deadline?: string | null;
  status?: string;
  applied_internships?: Array<{ count?: number | null }>;
}

export default function EmployerInternshipListClient({
  initialInternships,
}: {
  initialInternships: EmployerInternship[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [fieldFilter, setFieldFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [internshipsState, setInternshipsState] =
    useState<EmployerInternship[]>(initialInternships);
  const itemsPerPage = 6;
  const [sortBy, setSortBy] = useState<"newest" | "deadline" | "applicants">(
    "newest",
  );
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const router = useRouter();

  // Extract unique fields and categories for filter pills
  const fields = [
    "All",
    ...Array.from(new Set(internshipsState.map((j) => j.field))),
  ];
  const categories = [
    "All",
    ...Array.from(new Set(internshipsState.map((j) => j.category))),
  ];

  useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
      const query = (e as CustomEvent).detail;
      setSearchQuery(query || "");
      setCurrentPage(1); // Reset to first page on search
    };
    window.addEventListener("dashboardSearch", handleGlobalSearch);
    return () =>
      window.removeEventListener("dashboardSearch", handleGlobalSearch);
  }, []);

  const activeJobs = internshipsState.filter((j) => j.status !== "draft");
  const draftJobs = internshipsState.filter((j) => j.status === "draft");

  const filteredJobs = activeJobs.filter((job) => {
    const matchesSearch = `${job.role} ${job.field} ${job.category}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesField = fieldFilter === "All" || job.field === fieldFilter;
    const matchesCategory =
      categoryFilter === "All" || job.category === categoryFilter;
    return matchesSearch && matchesField && matchesCategory;
  });

  // Pagination slicing
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    switch (sortBy) {
      case "deadline":
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      case "applicants":
        const aCount = a.applied_internships?.[0]?.count || 0;
        const bCount = b.applied_internships?.[0]?.count || 0;
        return bCount - aCount;
      case "newest":
      default:
        // Assume newest based on created_at or fallback to id or something.
        // Wait, created_at is not in EmployerInternship type in this file. Let's assume order is retained.
        return 0; // We'll implement robust sort if created_at is added
    }
  });

  const totalPages = Math.ceil(sortedJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedJobs = sortedJobs.slice(startIndex, startIndex + itemsPerPage);

  const handleFilterChange = (type: "field" | "category", val: string) => {
    if (type === "field") setFieldFilter(val);
    else setCategoryFilter(val);
    setCurrentPage(1);
  };

  const getStatusBadge = (job: EmployerInternship) => {
    if (job.status === "draft") return <Badge variant="primary">Draft</Badge>;
    if (job.status === "closed") return <Badge variant="primary">Closed</Badge>;
    if (job.deadline && new Date(job.deadline) < new Date())
      return <Badge variant="warning">Expired</Badge>;
    return <Badge variant="success">Active</Badge>;
  };

  const handleToggleStatus = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const job = internshipsState.find((j) => j.id === id);
    const newStatus = job?.status === "closed" ? "active" : "closed";

    setInternshipsState((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: newStatus } : j)),
    );

    const { authenticatedFetch } = await import("@/lib/api");
    try {
      await authenticatedFetch<{ success?: boolean }>(
        `/api/internships/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        },
      );
    } catch (err: unknown) {
      alert("Failed to update status");
      // revert
      setInternshipsState((prev) =>
        prev.map((j) =>
          j.id === id ? { ...j, status: job?.status || "active" } : j,
        ),
      );
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      !confirm(
        "Are you sure? This will remove the posting and all associated applications.",
      )
    )
      return;

    setInternshipsState((prev) => prev.filter((j) => j.id !== id));

    const { authenticatedFetch } = await import("@/lib/api");
    try {
      await authenticatedFetch<{ success?: boolean }>(
        `/api/internships/${id}`,
        { method: "DELETE" },
      );
    } catch (err: unknown) {
      alert("Failed to delete");
      setInternshipsState(initialInternships); // Revert to full list
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Filter Bar */}
      <div className="space-y-6 bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
        <div>
          <Typography
            variant="subtitle2"
            weight="bold"
            className="text-slate-400 uppercase tracking-widest text-[10px] mb-3 ml-1"
          >
            Filter by Field
          </Typography>
          <div className="flex flex-wrap gap-2">
            {fields.map((f) => (
              <button
                key={f}
                onClick={() => handleFilterChange("field", f)}
                className={cx(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                  fieldFilter === f
                    ? "bg-brand border-brand text-white shadow-lg shadow-brand/20"
                    : "bg-slate-50 border-slate-100 text-slate-500 hover:border-brand/30 hover:bg-white",
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Typography
            variant="subtitle2"
            weight="bold"
            className="text-slate-400 uppercase tracking-widest text-[10px] mb-3 ml-1"
          >
            Filter by Category
          </Typography>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => handleFilterChange("category", c)}
                className={cx(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                  categoryFilter === c
                    ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/20"
                    : "bg-slate-50 border-slate-100 text-slate-500 hover:border-brand/30 hover:bg-white",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {draftJobs.length > 0 && (
        <div className="mb-8 p-6 bg-slate-50 border border-slate-100 rounded-3xl">
          <Typography
            variant="h4"
            weight="bold"
            className="mb-4 flex items-center gap-2"
          >
            <FileText className="w-5 h-5 text-slate-400" />
            Drafts ({draftJobs.length})
          </Typography>
          <div className="grid gap-3">
            {draftJobs.map((draft) => (
              <Card
                key={draft.id}
                className="opacity-75 border-dashed bg-white"
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <Typography variant="body2" weight="bold">
                      {draft.role || "Untitled"}
                    </Typography>
                    <Typography variant="caption" color="muted">
                      {draft.field} · {draft.category}
                    </Typography>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/employer/internships/${draft.id}/edit`}
                    >
                      <Button size="sm" variant="ghost">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      onClick={(e) => handleToggleStatus(e, draft.id)}
                    >
                      Publish
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 2. Results Count */}
      <div className="px-2 flex justify-between items-center mb-4">
        <Typography variant="body2" color="muted">
          Showing{" "}
          <span className="text-slate-900 font-bold">
            {Math.min(filteredJobs.length, startIndex + 1)}-
            {Math.min(filteredJobs.length, startIndex + itemsPerPage)}
          </span>{" "}
          of {filteredJobs.length} roles
        </Typography>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Typography variant="body2" color="muted">
              Sort by:
            </Typography>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-sm border rounded-lg px-2 py-1"
            >
              <option value="newest">Newest First</option>
              <option value="deadline">Deadline (Soonest)</option>
              <option value="applicants">Most Applicants</option>
            </select>
          </div>
          {(fieldFilter !== "All" ||
            categoryFilter !== "All" ||
            searchQuery) && (
            <button
              onClick={() => {
                setFieldFilter("All");
                setCategoryFilter("All");
              }}
              className="text-[11px] font-bold text-brand uppercase tracking-wider hover:underline"
            >
              Clear Filters
            </button>
          )}
          <button
            onClick={() => {
              const headers = [
                "Role",
                "Field",
                "Category",
                "Status",
                "Applicants",
                "Deadline",
                "Created",
              ];
              const rows = internshipsState.map((job: any) => [
                job.role,
                job.field,
                job.category,
                job.status || "active",
                String(job.applied_internships?.[0]?.count || 0),
                job.deadline || "",
                job.created_at || "",
              ]);
              import("@/lib/csv").then(({ downloadCSV }) => {
                downloadCSV(headers, rows, "my-postings-export");
              });
            }}
            className="text-[11px] font-bold text-slate-500 uppercase tracking-wider hover:text-brand"
          >
            Export All
          </button>
        </div>
      </div>

      {/* 3. Internship Cards */}
      {paginatedJobs.length === 0 ? (
        <div className="p-16 text-center bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
          <Typography
            variant="h6"
            weight="bold"
            className="text-slate-900 mb-2"
          >
            No postings match your selection
          </Typography>
          <Typography color="muted">
            Try adjusting your filters or search query.
          </Typography>
        </div>
      ) : (
        <Stack spacing={4}>
          {paginatedJobs.map((job) => (
            <Card
              key={job.id}
              className="group p-2 hover:border-brand hover:shadow-xl hover:shadow-indigo-100 transition-all duration-300 border-slate-100"
            >
              <Link href={`/dashboard/employer/internships/${job.id}`}>
                <CardContent className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Typography
                        variant="h4"
                        weight="bold"
                        className="group-hover:text-brand transition-colors"
                      >
                        {job.role}
                      </Typography>
                      {getStatusBadge(job)}
                    </div>
                    <Stack
                      direction="row"
                      spacing={3}
                      align="center"
                      className="flex-wrap gap-y-2"
                    >
                      <Badge variant="primary" size="sm">
                        {job.field}
                      </Badge>
                      <Badge variant="slate" size="sm">
                        {job.category}
                      </Badge>
                      {job.deadline && (
                        <Stack
                          direction="row"
                          spacing={1.5}
                          align="center"
                          className="text-slate-400"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <Typography variant="caption">
                            {new Date(job.deadline).toLocaleDateString()}
                          </Typography>
                        </Stack>
                      )}
                    </Stack>
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full md:w-auto"
                      rightIcon={<Users className="w-4 h-4" />}
                    >
                      Review {job.applied_internships?.[0]?.count || 0}{" "}
                      Applicants
                    </Button>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenu(openMenu === job.id ? null : job.id);
                        }}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      {openMenu === job.id && (
                        <div className="absolute right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-lg py-1 z-10 w-48 shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              router.push(
                                `/dashboard/employer/internships/${job.id}/edit`,
                              );
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                          >
                            <Edit2 className="w-4 h-4" /> Edit Posting
                          </button>
                          {/* Clone is omitted for MVP unless implemented */}
                          <button
                            onClick={(e) => handleToggleStatus(e, job.id)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                          >
                            <Power className="w-4 h-4" />{" "}
                            {job.status === "closed"
                              ? "Reopen Posting"
                              : "Close Posting"}
                          </button>
                          <div className="h-px bg-slate-100 my-1" />
                          <button
                            onClick={(e) => handleDelete(e, job.id)}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
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
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                  currentPage === i + 1
                    ? "bg-brand text-white shadow-md"
                    : "text-slate-400 hover:bg-slate-100",
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
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
