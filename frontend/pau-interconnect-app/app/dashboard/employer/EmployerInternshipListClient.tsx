"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Stack,
  Typography,
  Card,
  CardContent,
  Button,
  ConfirmDialog,
  EmptyState,
  StatusPill,
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
  Briefcase,
  Download,
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
  created_at?: string;
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
  const [confirmAction, setConfirmAction] = useState<{
    type: "close" | "reopen" | "delete";
    job: EmployerInternship;
  } | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
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
      setCurrentPage(1);
    };
    window.addEventListener("dashboardSearch", handleGlobalSearch);
    return () =>
      window.removeEventListener("dashboardSearch", handleGlobalSearch);
  }, []);

  // Close menu on click outside or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
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
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
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

  const getStatusPill = (job: EmployerInternship) => {
    if (job.status === "draft") return <StatusPill status="draft" />;
    if (job.status === "closed") return <StatusPill status="closed" />;
    if (job.deadline && new Date(job.deadline) < new Date())
      return <StatusPill status="expired" />;
    return <StatusPill status="active" />;
  };

  const handleClone = async (id: string) => {
    setOpenMenu(null);
    const job = internshipsState.find((j) => j.id === id);
    if (!job) return;

    const { authenticatedFetch } = await import("@/lib/api");
    try {
      const res = await authenticatedFetch<{ success: boolean; id: string }>(
        "/api/internships/post",
        {
          method: "POST",
          body: JSON.stringify({
            role: `${job.role} (Copy)`,
            field: job.field,
            category: job.category,
            status: "draft",
          }),
        },
      );
      if (res?.success) {
        toast.success("Posting cloned as a draft");
        router.refresh();
      }
    } catch {
      toast.error("Failed to clone posting");
    }
  };

  const executeToggleStatus = async (job: EmployerInternship) => {
    const id = job.id;
    const newStatus = job.status === "closed" ? "active" : "closed";

    setInternshipsState((prev) =>
      prev.map((j) => (j.id === id ? { ...j, status: newStatus } : j)),
    );

    const { authenticatedFetch } = await import("@/lib/api");
    setIsProcessingAction(true);
    try {
      await authenticatedFetch<{ success?: boolean }>(
        `/api/internships/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: newStatus }),
        },
      );
      toast.success(
        newStatus === "closed" ? "Posting closed" : "Posting reopened",
      );
      setConfirmAction(null);
    } catch {
      toast.error("Failed to update status");
      // revert
      setInternshipsState((prev) =>
        prev.map((j) =>
          j.id === id ? { ...j, status: job.status || "active" } : j,
        ),
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  const executeDelete = async (job: EmployerInternship) => {
    const id = job.id;
    setInternshipsState((prev) => prev.filter((j) => j.id !== id));

    const { authenticatedFetch } = await import("@/lib/api");
    setIsProcessingAction(true);
    try {
      await authenticatedFetch<{ success?: boolean }>(
        `/api/internships/${id}`,
        { method: "DELETE" },
      );
      toast.success("Posting deleted");
      setConfirmAction(null);
    } catch {
      toast.error("Failed to delete posting");
      setInternshipsState(initialInternships); // Revert
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Filter Bar */}
      <div className="space-y-6 bg-surface p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <Typography
            variant="subtitle2"
            weight="bold"
            className="text-fg-subtle uppercase tracking-widest text-[10px] mb-3 ml-1"
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
                    ? "bg-brand border-brand text-fg-inverse shadow-sm"
                    : "bg-surface-sunken border-border text-fg-muted hover:border-border-strong hover:bg-surface",
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
            className="text-fg-subtle uppercase tracking-widest text-[10px] mb-3 ml-1"
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
                    ? "bg-fg border-fg text-fg-inverse shadow-sm"
                    : "bg-surface-sunken border-border text-fg-muted hover:border-border-strong hover:bg-surface",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {draftJobs.length > 0 && (
        <div className="p-6 bg-surface-sunken border border-border rounded-2xl">
          <Typography
            variant="h4"
            weight="bold"
            className="mb-4 flex items-center gap-2 text-fg"
          >
            <FileText className="w-5 h-5 text-fg-subtle" />
            Drafts ({draftJobs.length})
          </Typography>
          <div className="grid gap-3">
            {draftJobs.map((draft) => (
              <Card
                key={draft.id}
                className="opacity-90 border-dashed border-border bg-surface"
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <Typography variant="body1" weight="bold" className="text-fg">
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
                      onClick={() => executeToggleStatus(draft)}
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
      <div className="px-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <Typography variant="body2" color="muted">
          Showing{" "}
          <span className="text-fg font-bold">
            {filteredJobs.length === 0
              ? 0
              : `${startIndex + 1}-${Math.min(filteredJobs.length, startIndex + itemsPerPage)}`}
          </span>{" "}
          of {filteredJobs.length} roles
        </Typography>
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Typography variant="body2" color="muted">
              Sort by:
            </Typography>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-sm border border-border bg-surface text-fg rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-focus-ring"
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
          <Button
            variant="ghost"
            size="sm"
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
              const rows = internshipsState.map((job) => [
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
            className="text-[11px] font-bold text-fg-muted uppercase tracking-wider hover:text-brand"
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Export All
          </Button>
        </div>
      </div>

      {/* 3. Internship Cards */}
      {paginatedJobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="w-8 h-8 text-brand" />}
          title="No postings match your selection"
          description="Try adjusting your filters or search query to find active internship opportunities."
          action={{
            label: "Clear Filters",
            onClick: () => {
              setFieldFilter("All");
              setCategoryFilter("All");
              setSearchQuery("");
            },
          }}
        />
      ) : (
        <Stack spacing={4}>
          {paginatedJobs.map((job) => (
            <Card
              key={job.id}
              className="group p-2 hover:border-brand/40 hover:shadow-md transition-all duration-200 border-border bg-surface"
            >
              <CardContent className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 gap-6">
                <Link
                  href={`/dashboard/employer/internships/${job.id}`}
                  className="flex-1 block group"
                >
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <Typography
                      variant="h4"
                      weight="bold"
                      className="group-hover:text-brand transition-colors text-fg"
                    >
                      {job.role}
                    </Typography>
                    {getStatusPill(job)}
                  </div>
                  <Stack
                    direction="row"
                    spacing={3}
                    align="center"
                    className="flex-wrap gap-y-2"
                  >
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-subtle text-brand">
                      {job.field}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-sunken text-fg-muted">
                      {job.category}
                    </span>
                    {job.deadline && (
                      <Stack
                        direction="row"
                        spacing={1.5}
                        align="center"
                        className="text-fg-subtle"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <Typography variant="caption" className="text-fg-subtle">
                          {new Date(job.deadline).toLocaleDateString()}
                        </Typography>
                      </Stack>
                    )}
                  </Stack>
                </Link>
                <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                  <Link
                    href={`/dashboard/employer/internships/${job.id}`}
                    className="w-full md:w-auto"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full md:w-auto"
                      rightIcon={<Users className="w-4 h-4" />}
                    >
                      Review {job.applied_internships?.[0]?.count || 0}{" "}
                      Applicants
                    </Button>
                  </Link>
                  <div className="relative" ref={openMenu === job.id ? menuRef : null}>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setOpenMenu(openMenu === job.id ? null : job.id);
                      }}
                      className="p-2 hover:bg-surface-sunken rounded-lg text-fg-subtle hover:text-fg transition-colors"
                      aria-label="More options"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    {openMenu === job.id && (
                      <div className="absolute right-0 mt-1 bg-surface-raised border border-border rounded-xl shadow-lg py-1 z-20 w-48 animate-in fade-in zoom-in duration-150">
                        <button
                          onClick={() => {
                            setOpenMenu(null);
                            router.push(
                              `/dashboard/employer/internships/${job.id}/edit`,
                            );
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-sunken flex items-center gap-2 text-fg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-fg-muted" /> Edit Posting
                        </button>
                        <button
                          onClick={() => handleClone(job.id)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-sunken flex items-center gap-2 text-fg transition-colors"
                        >
                          <Copy className="w-4 h-4 text-fg-muted" /> Clone Posting
                        </button>
                        <button
                          onClick={() => {
                            setOpenMenu(null);
                            setConfirmAction({
                              type: job.status === "closed" ? "reopen" : "close",
                              job,
                            });
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-sunken flex items-center gap-2 text-fg transition-colors"
                        >
                          <Power className="w-4 h-4 text-fg-muted" />{" "}
                          {job.status === "closed"
                            ? "Reopen Posting"
                            : "Close Posting"}
                        </button>
                        <div className="h-px bg-border my-1" />
                        <button
                          onClick={() => {
                            setOpenMenu(null);
                            setConfirmAction({ type: "delete", job });
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-danger-fg hover:bg-danger-subtle flex items-center gap-2 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* 4. Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="text-fg-muted hover:text-fg disabled:opacity-30"
          >
            Previous
          </Button>
          <div className="flex gap-1.5">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={cx(
                  "w-8 h-8 rounded-lg text-xs font-bold transition-all",
                  currentPage === i + 1
                    ? "bg-brand text-fg-inverse shadow-sm"
                    : "text-fg-muted hover:bg-surface-sunken",
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
            className="text-fg-muted hover:text-fg disabled:opacity-30"
          >
            Next
          </Button>
        </div>
      )}

      {/* Confirmation Dialogs for Close, Reopen, and Delete */}
      {confirmAction && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          onConfirm={() => {
            if (confirmAction.type === "delete") {
              executeDelete(confirmAction.job);
            } else {
              executeToggleStatus(confirmAction.job);
            }
          }}
          isLoading={isProcessingAction}
          variant={
            confirmAction.type === "delete"
              ? "danger"
              : confirmAction.type === "close"
                ? "warning"
                : "info"
          }
          title={
            confirmAction.type === "delete"
              ? "Delete Posting"
              : confirmAction.type === "close"
                ? "Close Posting"
                : "Reopen Posting"
          }
          message={
            confirmAction.type === "delete"
              ? `Are you sure you want to permanently delete "${confirmAction.job.role}"? This will remove the posting and all associated applications.`
              : confirmAction.type === "close"
                ? `Are you sure you want to close "${confirmAction.job.role}"? Students will no longer be able to submit new applications.`
                : `Are you sure you want to reopen "${confirmAction.job.role}"? It will become active and accept student applications.`
          }
          confirmLabel={
            confirmAction.type === "delete"
              ? "Delete Posting"
              : confirmAction.type === "close"
                ? "Close Posting"
                : "Reopen Posting"
          }
        />
      )}
    </div>
  );
}
