"use client";
import { useEffect, useState } from "react";
import { Search, Briefcase, SlidersHorizontal, ChevronLeft, ChevronRight, Sparkles, Flame, Clock, Building2 } from "lucide-react";
import {
  Button,
  Typography,
  Stack,
  Select,
} from "@/components/ui";
import { cx } from "@/utils/cx";
import InternshipCard from "@/components/InternshipCard";

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

const InternshipGrid = ({
  initialInternships,
  userProfile,
}: {
  initialInternships: Internship[];
  userProfile: any;
}) => {
  const [internships, setInternships] = useState<Internship[]>(initialInternships);
  const [filteredInternships, setFilteredInternships] = useState<Internship[]>(initialInternships);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInterest, setSelectedInterest] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [matchFilter, setMatchFilter] = useState("All");
  const [sortBy, setSortBy] = useState("match");
  const [availableFilters, setAvailableFilters] = useState<string[]>(["All"]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [showFilters, setShowFilters] = useState(false);

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
    if (Array.isArray(internship.interests)) return internship.interests;
    try {
      const parsed = JSON.parse(internship.interests as any);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    if (userProfile?.interests) {
      let interests: string[] = [];
      if (Array.isArray(userProfile.interests)) {
        interests = userProfile.interests.filter((i: any) => typeof i === "string");
      } else if (typeof userProfile.interests === "string") {
        try {
          const parsed = JSON.parse(userProfile.interests);
          if (Array.isArray(parsed)) {
            interests = parsed.filter((i: any) => typeof i === "string");
          }
        } catch {
          interests = [];
        }
      }
      setAvailableFilters(["All", ...interests]);
    }
  }, [userProfile]);

  useEffect(() => {
    const handleGlobalSearch = (e: Event) => {
      const query = (e as CustomEvent).detail;
      setSearchQuery(query || "");
    };

    window.addEventListener("dashboardSearch", handleGlobalSearch);
    return () => window.removeEventListener("dashboardSearch", handleGlobalSearch);
  }, []);

  useEffect(() => {
    let filtered = [...internships];

    if (selectedInterest !== "All") {
      filtered = filtered.filter((internship) =>
        getInternshipInterests(internship).some(
          (i: string) => i.toLowerCase() === selectedInterest.toLowerCase()
        )
      );
    }

    if (statusFilter !== "All") {
      filtered = filtered.filter((internship) => {
        const status = (internship.applicationStatus || "").toLowerCase();
        if (statusFilter === "Applied") return ["pending", "applied", "submitted"].includes(status);
        if (statusFilter === "Accepted") return status === "accepted" || status === "approved";
        if (statusFilter === "Rejected") return status === "rejected" || status === "denied";
        if (statusFilter === "None") return !internship.applicationStatus;
        return true;
      });
    }

    if (matchFilter !== "All") {
      const minMatch = parseInt(matchFilter);
      filtered = filtered.filter((internship) => (internship.matchPercentage ?? 0) >= minMatch);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (internship) =>
          internship.company?.toLowerCase().includes(query) ||
          internship.role?.toLowerCase().includes(query) ||
          internship.field?.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === "match") return (b.matchPercentage ?? 0) - (a.matchPercentage ?? 0);
      if (sortBy === "deadline") return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (sortBy === "company") return (a.company || "").localeCompare(b.company || "");
      return 0;
    });

    setFilteredInternships(filtered);
    setCurrentPage(1);
  }, [selectedInterest, statusFilter, matchFilter, sortBy, searchQuery, internships]);

  const totalItems = filteredInternships.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filteredInternships.slice(startIndex, startIndex + itemsPerPage);

  const quickFilters = [
    { label: "Remote", icon: Sparkles },
    { label: "Hybrid", icon: Building2 },
    { label: "Software Engineering", icon: Flame },
    { label: "Business", icon: Briefcase },
  ];

  return (
    <Stack spacing={8}>
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-100 shadow-sm">
        {/* Title Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
              <Briefcase className="w-[18px] h-[18px] text-indigo-600" />
            </div>
            <div>
              <h2 className="text-[17px] font-semibold text-slate-800 leading-tight">Internships</h2>
              <p className="text-xs text-slate-400 mt-0.5">{totalItems} opportunities available</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cx(
                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all border",
                showFilters
                  ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                  : "bg-white text-slate-500 border-slate-150 hover:border-slate-300"
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
            </button>

            <div className="w-[140px]">
              <Select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                options={[
                  { value: "match", label: "Best Match" },
                  { value: "deadline", label: "Deadline" },
                  { value: "company", label: "A → Z" },
                ]}
                className="bg-slate-50 border-slate-150 rounded-lg text-xs font-medium text-slate-600 h-9"
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
                  setSearchQuery(newQuery);
                  window.dispatchEvent(new CustomEvent("gridSearchChange", { detail: newQuery }));
                }}
                className={cx(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all",
                  isActive 
                    ? "bg-indigo-600 text-white shadow-sm" 
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
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
          <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-slate-50">
            <span className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider mr-1">Your interests</span>
            {availableFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedInterest(filter)}
                className={cx(
                  "px-3 py-1 rounded-md text-[11px] font-semibold transition-all",
                  selectedInterest === filter 
                    ? "bg-slate-800 text-white" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                )}
              >
                {filter}
              </button>
            ))}
          </div>
        )}

        {/* Expandable Advanced Filters */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 pt-4 mt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="w-full sm:w-[150px]">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Status</label>
              <Select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: "All", label: "Any Status" },
                  { value: "Applied", label: "Applied" },
                  { value: "Accepted", label: "Approved" },
                  { value: "Rejected", label: "Denied" },
                ]}
                className="bg-slate-50 border-slate-150 rounded-lg text-xs font-medium text-slate-600 h-9"
              />
            </div>
            <div className="w-full sm:w-[150px]">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Match %</label>
              <Select 
                value={matchFilter}
                onChange={(e) => setMatchFilter(e.target.value)}
                options={[
                  { value: "All", label: "Any Match" },
                  { value: "70", label: "70%+" },
                  { value: "40", label: "40%+" },
                ]}
                className="bg-slate-50 border-slate-150 rounded-lg text-xs font-medium text-slate-600 h-9"
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
            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-400">No internships match your filters</p>
            <p className="text-xs text-slate-300 mt-1">Try broadening your search criteria</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-400">
            {startIndex + 1}–{Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems}
          </p>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={currentPage === 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className={cx(
                  "w-8 h-8 rounded-lg text-xs font-semibold transition-all",
                  currentPage === page
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                )}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={currentPage === totalPages}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
