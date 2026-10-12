"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiBriefcase, FiSearch, FiFilter, FiChevronDown } from "react-icons/fi";
import { supabase } from "@/lib/supabaseClient";
import { cx } from "@/utils/cx";
import { Button, Typography, Stack, Select, EmptyState } from "@/components/ui";
import DashboardShell from "@/components/DashboardShell";
import LogbookWidget from "@/components/LogbookWidget";
import InternshipCard from "@/components/InternshipCard";
import { toStringArray, type Profile } from "@/types/domain";
import { useAuth } from "@/context/AuthContext";

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
  matchPercentage?: number;
  applicationStatus?: string;
  applicationStage?: string;
}

const Dashboard = ({
  userProfile,
  initialInternships,
}: {
  userProfile: Profile | null;
  initialInternships: Internship[];
}) => {
  const { user } = useAuth();
  const [internships, setInternships] =
    useState<Internship[]>(initialInternships);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInterest, setSelectedInterest] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [matchFilter, setMatchFilter] = useState("All");
  const [sortBy, setSortBy] = useState("match");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  useEffect(() => {
    const updateItemsPerPage = () => {
      const width = window.innerWidth;
      if (width < 640)
        setItemsPerPage(4); // mobile: 4 cards
      else if (width < 1024)
        setItemsPerPage(6); // tablet: 6 cards
      else setItemsPerPage(8); // desktop: 8 cards
    };
    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);

  const getInternshipInterests = (internship: Internship) =>
    toStringArray(internship.interests);

  const availableFilters = userProfile?.interests
    ? ["All", ...toStringArray(userProfile.interests)]
    : ["All"];

  const updateFilterAndResetPage = (updater: () => void) => {
    updater();
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    updateFilterAndResetPage(() => {
      setSearchQuery(value);
    });
  };

  const refreshData = useCallback(async () => {
    try {
      if (!user) return;

      const { data: internshipsData } = await supabase
        .from("internships")
        .select("*");

      const { data: appliedData } = await supabase
        .from("applied_internships")
        .select("internship_id, status")
        .eq("user_id", user.id);

      const statusMap = new Map(
        (appliedData ?? []).map(
          (record: { internship_id: string; status: string }) => [
            record.internship_id,
            record.status,
          ],
        ),
      );

      if (internshipsData) {
        const merged = internshipsData.map((internship) => {
          const existing = internships.find((i) => i.id === internship.id);
          return {
            ...internship,
            matchPercentage: existing?.matchPercentage ?? 0,
            applicationStatus: statusMap.get(internship.id),
          };
        });

        setInternships(merged);
      }
    } catch (err) {
      console.warn("Error refreshing data:", err);
    }
  }, [internships, user]);

  useEffect(() => {
    const onSavedUpdate = () => refreshData();
    window.addEventListener(
      "savedInternshipsUpdate",
      onSavedUpdate as EventListener,
    );

    return () => {
      window.removeEventListener(
        "savedInternshipsUpdate",
        onSavedUpdate as EventListener,
      );
    };
  }, [refreshData]);

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
        if (statusFilter === "Applied")
          return status === "pending" || status === "applied";
        if (statusFilter === "Accepted") return status === "accepted";
        if (statusFilter === "Rejected") return status === "rejected";
        if (statusFilter === "None") return !internship.applicationStatus;
        return true;
      });
    }

    if (matchFilter !== "All") {
      const minMatch = parseInt(matchFilter);
      filtered = filtered.filter(
        (internship) => (internship.matchPercentage ?? 0) >= minMatch,
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (internship) =>
          (internship.company &&
            internship.company.toLowerCase().includes(query)) ||
          (internship.role && internship.role.toLowerCase().includes(query)) ||
          (internship.field && internship.field.toLowerCase().includes(query)),
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === "match") {
        return (b.matchPercentage ?? 0) - (a.matchPercentage ?? 0);
      }
      if (sortBy === "deadline") {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (sortBy === "company") {
        return a.company.localeCompare(b.company);
      }
      return 0;
    });

    return filtered;
  }, [
    internships,
    selectedInterest,
    statusFilter,
    matchFilter,
    searchQuery,
    sortBy,
  ]);

  return (
    <DashboardShell
      userProfile={userProfile}
      searchQuery={searchQuery}
      onSearchChange={handleSearchChange}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-0">
        {userProfile?.id && (
          <div className="mb-8">
            <LogbookWidget userId={userProfile.id} />
          </div>
        )}

        {(() => {
          const activeFiltersCount =
            (selectedInterest !== "All" ? 1 : 0) +
            (statusFilter !== "All" ? 1 : 0) +
            (matchFilter !== "All" ? 1 : 0);

          return (
            <div className="bg-surface rounded-2xl p-6 md:p-8 shadow-xs border border-border mb-10 overflow-hidden">
              <Stack spacing={isFiltersExpanded ? 6 : 4}>
                {/* Top row: Section Headers and Quick Filters */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-brand-subtle p-3 rounded-xl border border-brand/10 text-brand">
                      <FiBriefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <Typography
                        variant="h4"
                        weight="bold"
                        className="text-fg leading-tight"
                      >
                        Internship Portal
                      </Typography>
                      <Typography
                        variant="caption"
                        className="text-fg-muted font-normal mt-0.5"
                      >
                        Find your next verified technical career placement at PAU
                      </Typography>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-bold text-fg-subtle uppercase tracking-widest mr-1">
                      Quick Filters
                    </span>
                    {[
                      "Remote",
                      "Hybrid",
                      "Software Engineering",
                      "Business",
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleSearchChange(tag)}
                        className="text-xs px-3.5 py-1.5 bg-surface-sunken text-fg-muted hover:bg-brand-subtle hover:text-brand transition-colors rounded-xl font-medium border border-border cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
                      >
                        #{tag}
                      </button>
                    ))}

                    <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

                    <button
                      type="button"
                      onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                      className={cx(
                        "flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-xl font-semibold transition-all border cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
                        isFiltersExpanded
                          ? "bg-brand text-fg-inverse border-brand shadow-xs"
                          : "bg-surface-sunken text-fg-muted border-border hover:bg-surface-raised hover:text-fg",
                      )}
                    >
                      <FiFilter className="w-3.5 h-3.5" />
                      <span>Filters</span>
                      {activeFiltersCount > 0 && (
                        <span className="flex items-center justify-center bg-brand-subtle text-brand w-4 h-4 rounded-full text-[10px] font-bold">
                          {activeFiltersCount}
                        </span>
                      )}
                      <FiChevronDown
                        className={cx(
                          "w-3.5 h-3.5 transition-transform duration-200",
                          isFiltersExpanded && "rotate-180",
                        )}
                      />
                    </button>
                  </div>
                </div>

                {/* Bottom row: Active Filters */}
                {isFiltersExpanded && (
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 pt-5 border-t border-border animate-in fade-in slide-in-from-top-2 duration-200 ease-out">
                    <Stack direction="row" spacing={2} className="flex-wrap">
                      {availableFilters.map((filter) => (
                        <Button
                          key={filter}
                          variant={
                            selectedInterest === filter ? "solid" : "ghost"
                          }
                          size="sm"
                          onClick={() =>
                            updateFilterAndResetPage(() => {
                              setSelectedInterest(filter);
                            })
                          }
                          className={cx(
                            "px-4 rounded-xl font-medium text-xs transition-all",
                            selectedInterest === filter
                              ? "bg-brand text-fg-inverse shadow-xs"
                              : "text-fg-muted hover:text-fg",
                          )}
                        >
                          {filter}
                        </Button>
                      ))}
                    </Stack>

                    <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
                      <div className="w-full sm:w-[150px]">
                        <Select
                          value={statusFilter}
                          onChange={(e) =>
                            updateFilterAndResetPage(() => {
                              setStatusFilter(e.target.value);
                            })
                          }
                          options={[
                            { value: "All", label: "Any Status" },
                            { value: "Applied", label: "Applied" },
                            { value: "Accepted", label: "Approved" },
                            { value: "Rejected", label: "Denied" },
                          ]}
                          className="text-xs"
                        />
                      </div>
                      <div className="w-full sm:w-[150px]">
                        <Select
                          value={matchFilter}
                          onChange={(e) =>
                            updateFilterAndResetPage(() => {
                              setMatchFilter(e.target.value);
                            })
                          }
                          options={[
                            { value: "All", label: "Any Match" },
                            { value: "70", label: "70%+ Match" },
                            { value: "40", label: "40%+ Match" },
                          ]}
                          className="text-xs"
                        />
                      </div>
                      <div className="w-full sm:w-[150px]">
                        <Select
                          value={sortBy}
                          onChange={(e) =>
                            updateFilterAndResetPage(() => {
                              setSortBy(e.target.value);
                            })
                          }
                          options={[
                            { value: "match", label: "Best Match" },
                            { value: "deadline", label: "Deadline" },
                            { value: "company", label: "Company A-Z" },
                          ]}
                          className="text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </Stack>
            </div>
          );
        })()}

        {(() => {
          const totalItems = (filteredInternships || []).length;
          const totalPages = Math.ceil(totalItems / itemsPerPage);
          const startIndex = (currentPage - 1) * itemsPerPage;
          const paginatedItems = (filteredInternships || []).slice(
            startIndex,
            startIndex + itemsPerPage,
          );

          return (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                  <div className="col-span-full">
                    <EmptyState
                      icon={<FiSearch className="w-8 h-8" />}
                      title="No internships found"
                      description="Try adjusting your filter options or clearing search keywords."
                      action={{
                        label: "Clear filters",
                        onClick: () => {
                          setSelectedInterest("All");
                          setStatusFilter("All");
                          setMatchFilter("All");
                          setSearchQuery("");
                        },
                      }}
                    />
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-12 pb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-xl text-xs font-semibold transition-all border border-border bg-surface text-fg-muted hover:border-brand hover:text-brand disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-fg-muted cursor-pointer"
                  >
                    ← Previous
                  </button>

                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => {
                            setCurrentPage(page);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className={cx(
                            "w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer",
                            currentPage === page
                              ? "bg-brand text-fg-inverse shadow-xs"
                              : "bg-surface text-fg-muted border border-border hover:border-brand hover:text-brand",
                          )}
                        >
                          {page}
                        </button>
                      ),
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-xl text-xs font-semibold transition-all border border-border bg-surface text-fg-muted hover:border-brand hover:text-brand disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-fg-muted cursor-pointer"
                  >
                    Next →
                  </button>
                </div>
              )}

              {totalItems > 0 && (
                <div className="text-center mt-4">
                  <Typography variant="caption" className="text-fg-subtle">
                    Showing {startIndex + 1}–
                    {Math.min(startIndex + itemsPerPage, totalItems)} of{" "}
                    {totalItems} internships
                  </Typography>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </DashboardShell>
  );
};

export default Dashboard;
