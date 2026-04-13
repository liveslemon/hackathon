"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiLogOut, FiSearch, FiUser, FiBell, FiBriefcase } from "react-icons/fi";
import { supabase } from "@/lib/supabaseClient";
import { cx } from "@/utils/cx";
import {
  Button,
  Input,
  Typography,
  Stack,
  Card,
  Badge,
  Modal,
  Select,
} from "@/components/ui";
import InternshipCard from "@/components/InternshipCard";
import DashboardShell from "@/components/DashboardShell";
import LogbookWidget from "@/components/LogbookWidget";

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
  userProfile: any;
  initialInternships: Internship[];
}) => {
  const [internships, setInternships] =
    useState<Internship[]>(initialInternships);
  const [filteredInternships, setFilteredInternships] = useState<Internship[]>(
    initialInternships,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInterest, setSelectedInterest] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [matchFilter, setMatchFilter] = useState("All");
  const [sortBy, setSortBy] = useState("match");
  const [availableFilters, setAvailableFilters] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  useEffect(() => {
    const updateItemsPerPage = () => {
      const width = window.innerWidth;
      if (width < 640) setItemsPerPage(4);       // mobile: 4 cards
      else if (width < 1024) setItemsPerPage(6);  // tablet: 6 cards
      else setItemsPerPage(8);                     // desktop: 8 cards
    };
    updateItemsPerPage();
    window.addEventListener("resize", updateItemsPerPage);
    return () => window.removeEventListener("resize", updateItemsPerPage);
  }, []);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationSeverity, setNotificationSeverity] = useState<
    "success" | "error" | "info" | "warning"
  >("info");

  const router = useRouter();

  const getInternshipInterests = (internship: Internship | any) => {
    if (Array.isArray(internship.interests)) return internship.interests;
    try {
      const parsed = JSON.parse(internship.interests);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

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
  }, []);

  useEffect(() => {
    if (userProfile?.interests) {
      let interests: string[] = [];
      if (Array.isArray(userProfile.interests)) {
        interests = (userProfile.interests as unknown[]).filter(
          (i): i is string => typeof i === "string",
        );
      } else if (typeof userProfile.interests === "string") {
        try {
          const parsed = JSON.parse(userProfile.interests);
          if (Array.isArray(parsed)) {
            interests = parsed.filter(
              (i): i is string => typeof i === "string",
            );
          }
        } catch {
          interests = [];
        }
      }

      setAvailableFilters(["All", ...interests]);
      setSelectedInterest("All");
    } else {
      setAvailableFilters(["All"]);
      setSelectedInterest("All");
    }
  }, [userProfile]);

  useEffect(() => {
    setFilteredInternships(() => {
      let filtered = [...internships];

      // 1. Interest Filter
      if (selectedInterest !== "All") {
        filtered = filtered.filter((internship) =>
          getInternshipInterests(internship).some(
            (i: string) => i.toLowerCase() === selectedInterest.toLowerCase(),
          ),
        );
      }

      // 2. Status Filter
      if (statusFilter !== "All") {
        filtered = filtered.filter((internship) => {
          const status = (internship.applicationStatus || "").toLowerCase();
          if (statusFilter === "Applied") return status === "pending" || status === "applied";
          if (statusFilter === "Accepted") return status === "accepted";
          if (statusFilter === "Rejected") return status === "rejected";
          if (statusFilter === "None") return !internship.applicationStatus;
          return true;
        });
      }

      // 3. Match Filter
      if (matchFilter !== "All") {
        const minMatch = parseInt(matchFilter);
        filtered = filtered.filter((internship) => (internship.matchPercentage ?? 0) >= minMatch);
      }

      // 4. Search Filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (internship) =>
            (internship.company &&
              internship.company.toLowerCase().includes(query)) ||
            (internship.role &&
              internship.role.toLowerCase().includes(query)) ||
            (internship.field &&
              internship.field.toLowerCase().includes(query)),
        );
      }

      // 5. Sorting
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
    });
    setCurrentPage(1);
  }, [selectedInterest, statusFilter, matchFilter, sortBy, searchQuery, internships]);

  const refreshData = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: internshipsData } = await supabase
        .from("internships")
        .select("*");
      
      const { data: appliedData } = await supabase
        .from("applied_internships")
        .select("internship_id, status")
        .eq("user_id", session.user.id);

      const statusMap = new Map(appliedData?.map(a => [a.internship_id, a.status]) || []);

      if (internshipsData) {
        const merged = internshipsData.map((internship) => {
          const existing = internships.find((i) => i.id === internship.id);
          return {
            ...internship,
            matchPercentage: existing?.matchPercentage ?? 0,
            applicationStatus: statusMap.get(internship.id)
          };
        });

        setInternships(merged);
        setFilteredInternships(merged);
        setNotificationMessage(`Loaded ${merged.length} internships`);
        setNotificationSeverity("success");
        setNotificationOpen(true);
        setTimeout(() => setNotificationOpen(false), 3000);
      }
    } catch (err) {
      console.warn("Error refreshing data:", err);
    }
  };

  const getMatchColor = (percentage?: number) => {
    if (percentage === undefined || percentage === null) return "primary";
    if (percentage >= 70) return "success";
    if (percentage >= 40) return "warning";
    return "error";
  };

  return (
    <DashboardShell
      userProfile={userProfile}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-0">
        {userProfile?.id && <div className="mb-8"><LogbookWidget userId={userProfile.id} /></div>}
        
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-[0_1px_3px_rgba(0,0,0,0.02)] border border-slate-100/80 mb-10 overflow-hidden">
          <Stack spacing={8}>
            {/* Top row: Section Headers and Quick Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                 <div className="bg-brand/5 p-3 rounded-2xl border border-brand/10">
                   <FiBriefcase className="w-5 h-5 text-brand" />
                 </div>
                 <div>
                   <Typography variant="h4" weight="bold" className="text-slate-900 leading-tight">Internship Portal</Typography>
                   <Typography variant="caption" className="text-slate-400 font-medium">Find your next technical career step at PAU</Typography>
                 </div>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] mr-2">Quick Filters</span>
                {["Remote", "Hybrid", "Software Engineering", "Business"].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSearchQuery(tag)}
                    className="text-[11px] px-4 py-2 bg-[#f4f7fa] text-slate-500 hover:bg-brand hover:text-white transition-all rounded-xl font-bold border border-slate-100/50"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom row: Active Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8 pt-6 border-t border-slate-50">
              <Stack direction="row" spacing={2} className="flex-wrap">
                {availableFilters.map((filter) => (
                  <Button
                    key={filter}
                    variant={selectedInterest === filter ? "solid" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedInterest(filter)}
                    className={cx(
                      "px-6 rounded-xl font-bold text-xs transition-all",
                      selectedInterest === filter 
                        ? "bg-brand text-white shadow-lg shadow-brand/20" 
                        : "text-slate-400 hover:text-slate-900"
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
                     onChange={(e) => setStatusFilter(e.target.value)}
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
                     onChange={(e) => setMatchFilter(e.target.value)}
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
                     onChange={(e) => setSortBy(e.target.value)}
                     options={[
                       { value: "match", label: "Best Match" },
                       { value: "deadline", label: "Deadline" },
                     ]}
                     className="bg-[#f4f7fa] border-none rounded-xl text-xs font-bold text-slate-600 h-10"
                   />
                 </div>
              </div>
            </div>
          </Stack>
        </div>

        {(() => {
          const totalItems = (filteredInternships || []).length;
          const totalPages = Math.ceil(totalItems / itemsPerPage);
          const startIndex = (currentPage - 1) * itemsPerPage;
          const paginatedItems = (filteredInternships || []).slice(startIndex, startIndex + itemsPerPage);

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
                    onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    disabled={currentPage === 1}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 border border-slate-200 bg-white text-slate-600 hover:border-brand hover:text-brand disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-600"
                  >
                    ← Previous
                  </button>

                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className={`w-10 h-10 rounded-xl text-sm font-bold transition-all duration-200 ${
                          currentPage === page
                            ? 'bg-gradient-to-br from-brand to-brand-secondary text-white shadow-lg shadow-indigo-200'
                            : 'bg-white text-slate-500 border border-slate-200 hover:border-brand hover:text-brand'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
                    Showing {startIndex + 1}–{Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} internships
                  </Typography>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </DashboardShell>
  );
}

export default Dashboard;
