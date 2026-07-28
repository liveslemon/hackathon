"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FiBriefcase, FiSearch, FiFilter, FiChevronDown } from "react-icons/fi";
import { supabase } from "@/lib/supabaseClient";
import { cx } from "@/utils/cx";
import { Button, Typography, Stack, Card, Select } from "@/components/ui";
import DashboardShell from "@/components/DashboardShell";
import LogbookWidget from "@/components/LogbookWidget";
import InternshipCard from "@/components/InternshipCard";
import { toStringArray, type Profile } from "@/types/domain";

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
}

const Dashboard = ({
  userProfile,
  initialInternships,
}: {
  userProfile: Profile | null;
  initialInternships: Internship[];
}) => {
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
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
  }, [internships]);

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
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100/80 mb-10 overflow-hidden">
              <Stack spacing={isFiltersExpanded ? 8 : 4}>
                {/* Top row: Section Headers and Quick Filters */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="bg-brand/5 p-3 rounded-2xl border border-brand/10">
                      <FiBriefcase className="w-5 h-5 text-brand" />
                    </div>
                    <div>
                      <Typography
                        variant="h4"
                        weight="bold"
                        className="text-slate-900 leading-tight"
                      >
                        Internship Portal
                      </Typography>
                      <Typography
                        variant="caption"
                        className="text-slate-400 font-medium"
                      >
                        Find your next technical career step at PAU
                      </Typography>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] mr-2">
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
                        onClick={() => handleSearchChange(tag)}
                        className="text-[11px] px-4 py-2 bg-[#f4f7fa] text-slate-500 hover:bg-brand hover:text-white transition-all rounded-xl font-bold border border-slate-100/50"
                      >
                        #{tag}
                      </button>
                    ))}

                    <div className="w-px h-5 bg-slate-200 mx-2 hidden sm:block" />

                    <button
                      onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                      className={cx(
                        "flex items-center gap-2 text-[11px] px-4 py-2 rounded-xl font-bold transition-all border relative",
                        isFiltersExpanded
                          ? "bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10"
                          : "bg-[#f4f7fa] text-slate-500 border-slate-100/50 hover:bg-slate-100 hover:text-slate-800",
                      )}
                    >
                      <FiFilter className="w-3.5 h-3.5" />
                      <span>Filters</span>
                      {activeFiltersCount > 0 && (
                        <span className="flex items-center justify-center bg-brand text-white w-4 h-4 rounded-full text-[9px] font-extrabold shadow-sm">
                          {activeFiltersCount}
                        </span>
                      )}
                      <FiChevronDown
                        className={cx(
                          "w-3.5 h-3.5 transition-transform duration-300",
                          isFiltersExpanded && "rotate-180",
                        )}
                      />
                    </button>
                  </div>
                </div>

                {/* Bottom row: Active Filters */}
                {isFiltersExpanded && (
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8 pt-6 border-t border-slate-50 animate-in fade-in slide-in-from-top-4 duration-300 ease-out">
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
                            "px-6 rounded-xl font-bold text-xs transition-all",
                            selectedInterest === filter
                              ? "bg-brand text-white shadow-lg shadow-brand/20"
                              : "text-slate-400 hover:text-slate-900",
                          )}
                        >
                          {filter}
                        </Button>
                      ))}
                    </Stack>

                    <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
                      <div className="w-full sm:w-[160px]">
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
                          className="bg-[#f4f7fa] border-none rounded-xl text-xs font-bold text-slate-600 h-10"
                        />
                      </div>
                      <div className="w-full sm:w-[160px]">
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
                          className="bg-[#f4f7fa] border-none rounded-xl text-xs font-bold text-slate-600 h-10"
                        />
                      </div>
                      <div className="w-full sm:w-[160px]">
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
                          ]}
                          className="bg-[#f4f7fa] border-none rounded-xl text-xs font-bold text-slate-600 h-10"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {paginatedItems.length > 0 ? (
                  paginatedItems.map((internship, index) => (
                    <div
                      key={internship.id}
                      className="animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <InternshipCard internship={internship} />
                    </div>
                  ))
                ) : (
                  <Card className="p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                      <FiSearch className="w-10 h-10 text-slate-300" />
                    </div>
                    <Typography variant="h5" color="muted">
                      No internships found. Try adjusting your filters.
                    </Typography>
                  </Card>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-12 pb-4">
                  <button
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={currentPage === 1}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border border-slate-200 bg-white text-slate-600 hover:border-brand hover:text-brand disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-600"
                  >
                    ← Previous
                  </button>

                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => {
                            setCurrentPage(page);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className={`w-10 h-10 rounded-xl text-sm font-bold transition-all duration-200 ${
                            currentPage === page
                              ? "bg-gradient-to-br from-brand to-brand-secondary text-white shadow-lg shadow-indigo-200"
                              : "bg-white text-slate-500 border border-slate-200 hover:border-brand hover:text-brand"
                          }`}
                        >
                          {page}
                        </button>
                      ),
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    disabled={currentPage === totalPages}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border border-slate-200 bg-white text-slate-600 hover:border-brand hover:text-brand disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-600"
                  >
                    Next →
                  </button>
                </div>
              )}

              {totalItems > 0 && (
                <div className="text-center mt-4">
                  <Typography variant="caption" color="muted">
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
