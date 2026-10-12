"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Briefcase,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Flame,
  Building2,
} from "lucide-react";
import { Stack, Select } from "@/components/ui";
import { cx } from "@/utils/cx";
import InternshipCard from "@/components/InternshipCard";
import { toStringArray } from "@/types/domain";

interface Internship {
  id: string;
  company: string;
  role: string;
  location: string;
  field: string;
  category: string;
  description: string;
  deadline: string;
  interests: string[];
  matchPercentage?: number | null;
  applicationStatus?: string;
  applicationStage?: string;
}

const InternshipGrid = ({
  initialInternships,
  userProfile,
}: {
  initialInternships: Internship[];
  userProfile: { id?: string; interests?: string[] | string | null } | null;
}) => {
  const internships = initialInternships;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInterest, setSelectedInterest] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [matchFilter, setMatchFilter] = useState("All");
  const [sortBy, setSortBy] = useState("match");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [showFilters, setShowFilters] = useState(false);

  const applyAndResetPage = (updater: () => void) => {
    updater();
    setCurrentPage(1);
  };

  useEffect(() => {
    const updateItemsPerPage = () => {
      const width = window.innerWidth;
      if (width < 640) setItemsPerPage(4);
      else if (width < 1024) setItemsPerPage(6);
      else setItemsPerPage(8);
    };
    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);

  const getInternshipInterests = (internship: Internship) => {
    return toStringArray(internship.interests);
  };

  const availableFilters = useMemo(() => {
    const interests = toStringArray(userProfile?.interests);
    return ["All", ...interests];
  }, [userProfile?.interests]);

  useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
      const query = (e as CustomEvent).detail;
      applyAndResetPage(() => {
        setSearchQuery(query || "");
      });
    };

    window.addEventListener("dashboardSearch", handleGlobalSearch);
    return () =>
      window.removeEventListener("dashboardSearch", handleGlobalSearch);
  }, []);

  const filteredInternships = useMemo(() => {
    let filtered = [...internships];

    if (selectedInterest !== "All") {
      filtered = filtered.filter((internship) =>
        getInternshipInterests(internship).some(
          (i: string) => i.toLowerCase() === selectedInterest.toLowerCase(),
        ),
      );
    }

    if (statusFilter !== "All") {
      filtered = filtered.filter((internship) => {
        const status = (internship.applicationStatus || "").toLowerCase();
        const stage = (internship.applicationStage || "").toLowerCase();
        if (statusFilter === "Applied") {
          return (
            [
              "pending",
              "applied",
              "submitted",
              "reviewed",
              "shortlisted",
              "interview",
              "offered",
            ].includes(status) ||
            [
              "applied",
              "reviewed",
              "shortlisted",
              "interview",
              "offered",
            ].includes(stage)
          );
        }
        if (statusFilter === "Accepted") {
          return (
            status === "accepted" ||
            status === "approved" ||
            stage === "accepted"
          );
        }
        if (statusFilter === "Rejected") {
          return (
            status === "rejected" ||
            status === "denied" ||
            stage === "rejected"
          );
        }
        if (statusFilter === "None") {
          return !internship.applicationStatus && !internship.applicationStage;
        }
        return true;
      });
    }

    if (matchFilter !== "All") {
      const minMatch = parseInt(matchFilter, 10);
      filtered = filtered.filter(
        (internship) => (internship.matchPercentage ?? 0) >= minMatch,
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((internship) => {
        const companyMatch = internship.company?.toLowerCase().includes(query);
        const roleMatch = internship.role?.toLowerCase().includes(query);
        const fieldMatch = internship.field?.toLowerCase().includes(query);
        const categoryMatch = internship.category?.toLowerCase().includes(query);
        const locationMatch = internship.location?.toLowerCase().includes(query);
        const descMatch = internship.description?.toLowerCase().includes(query);
        const interestsMatch = getInternshipInterests(internship).some((i) =>
          i.toLowerCase().includes(query),
        );
        return Boolean(
          companyMatch ||
            roleMatch ||
            fieldMatch ||
            categoryMatch ||
            locationMatch ||
            descMatch ||
            interestsMatch,
        );
      });
    }

    filtered.sort((a, b) => {
      if (sortBy === "match")
        return (b.matchPercentage ?? 0) - (a.matchPercentage ?? 0);
      if (sortBy === "deadline") {
        const timeA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const timeB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return timeA - timeB;
      }
      if (sortBy === "company")
        return (a.company || "").localeCompare(b.company || "");
      return 0;
    });

    return filtered;
  }, [
    selectedInterest,
    statusFilter,
    matchFilter,
    sortBy,
    searchQuery,
    internships,
  ]);

  const totalItems = filteredInternships.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredInternships.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const quickFilters = [
    { label: "Remote", icon: Sparkles },
    { label: "Hybrid", icon: Building2 },
    { label: "Software Engineering", icon: Flame },
    { label: "Business", icon: Briefcase },
  ];

  return (
    <Stack spacing={8}>
      {/* Header Bar */}
      <div className="bg-surface rounded-2xl p-5 md:p-6 border border-border shadow-sm text-fg">
        {/* Title Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-subtle rounded-xl flex items-center justify-center">
              <Briefcase className="w-[18px] h-[18px] text-brand" />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-fg leading-tight">
                Internships
              </h2>
              <p className="text-xs text-fg-muted mt-0.5">
                {totalItems} opportunities available
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cx(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all border cursor-pointer min-h-[40px]",
                showFilters
                  ? "bg-brand-subtle text-brand border-brand/20 font-semibold"
                  : "bg-surface text-fg-muted border-border hover:border-border-strong",
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
            </button>

            <div className="w-[140px]">
              <Select
                value={sortBy}
                onChange={(e) =>
                  applyAndResetPage(() => {
                    setSortBy(e.target.value);
                  })
                }
                options={[
                  { value: "match", label: "Best Match" },
                  { value: "deadline", label: "Deadline" },
                  { value: "company", label: "A → Z" },
                ]}
                className="bg-surface-sunken border-border rounded-lg text-xs font-medium text-fg-muted h-9"
              />
            </div>
          </div>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {quickFilters.map(({ label, icon: Icon }) => {
            const isActive = searchQuery === label;
            return (
              <button
                key={label}
                onClick={() => {
                  const newQuery = isActive ? "" : label;
                  applyAndResetPage(() => {
                    setSearchQuery(newQuery);
                  });
                  window.dispatchEvent(
                    new CustomEvent("gridSearchChange", { detail: newQuery }),
                  );
                }}
                className={cx(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all",
                  isActive
                    ? "bg-brand text-brand-fg shadow-sm"
                    : "bg-surface-sunken text-fg-muted hover:bg-surface-sunken hover:text-fg",
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Interest pills */}
        {availableFilters.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-border">
            <span className="text-[10px] text-fg-subtle font-semibold uppercase tracking-wider mr-1">
              Your interests
            </span>
            {availableFilters.map((filter) => (
              <button
                key={filter}
                onClick={() =>
                  applyAndResetPage(() => {
                    setSelectedInterest(filter);
                  })
                }
                className={cx(
                  "px-3 py-1 rounded-md text-[11px] font-semibold transition-all",
                  selectedInterest === filter
                    ? "bg-fg text-fg-inverse"
                    : "text-fg-subtle hover:text-fg-muted hover:bg-surface-sunken",
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        )}

        {/* Expandable Advanced Filters */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 pt-4 mt-4 border-t border-border animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="w-full sm:w-[150px]">
              <label className="text-[10px] font-semibold text-fg-subtle uppercase tracking-wider mb-1 block">
                Status
              </label>
              <Select
                value={statusFilter}
                onChange={(e) =>
                  applyAndResetPage(() => {
                    setStatusFilter(e.target.value);
                  })
                }
                options={[
                  { value: "All", label: "Any Status" },
                  { value: "Applied", label: "Applied" },
                  { value: "Accepted", label: "Approved" },
                  { value: "Rejected", label: "Denied" },
                ]}
                className="bg-surface-sunken border-border rounded-lg text-xs font-medium text-fg-muted h-9"
              />
            </div>
            <div className="w-full sm:w-[150px]">
              <label className="text-[10px] font-semibold text-fg-subtle uppercase tracking-wider mb-1 block">
                Match %
              </label>
              <Select
                value={matchFilter}
                onChange={(e) =>
                  applyAndResetPage(() => {
                    setMatchFilter(e.target.value);
                  })
                }
                options={[
                  { value: "All", label: "Any Match" },
                  { value: "70", label: "70%+" },
                  { value: "40", label: "40%+" },
                ]}
                className="bg-surface-sunken border-border rounded-lg text-xs font-medium text-fg-muted h-9"
              />
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {paginatedItems.length > 0 ? (
          paginatedItems.map((internship, index) => (
            <div
              key={internship.id}
              className="animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <InternshipCard internship={internship} />
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center">
            <div className="w-14 h-14 bg-surface-sunken rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-fg-subtle" />
            </div>
            <p className="text-sm font-medium text-fg-subtle">
              No internships match your filters
            </p>
            <p className="text-xs text-fg-subtle mt-1">
              Try broadening your search criteria
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-fg-subtle">
            {startIndex + 1}–{Math.min(startIndex + itemsPerPage, totalItems)}{" "}
            of {totalItems}
          </p>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setCurrentPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-fg-subtle hover:bg-surface-sunken disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => {
                  setCurrentPage(page);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={cx(
                  "w-8 h-8 rounded-lg text-xs font-semibold transition-all",
                  currentPage === page
                    ? "bg-fg text-fg-inverse"
                    : "text-fg-subtle hover:bg-surface-sunken hover:text-fg-muted",
                )}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => {
                setCurrentPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-fg-subtle hover:bg-surface-sunken disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </Stack>
  );
};

export default InternshipGrid;
