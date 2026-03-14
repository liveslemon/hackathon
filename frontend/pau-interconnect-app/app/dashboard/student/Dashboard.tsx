"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiLogOut, FiSearch, FiUser, FiBell } from "react-icons/fi";
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
import DashboardHeader from "@/components/DashboardHeader";

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
  const [statusFilter, setStatusFilter] = useState("All"); // "All", "Applied", "Accepted", "Rejected"
  const [matchFilter, setMatchFilter] = useState("All"); // "All", "70", "40"
  const [sortBy, setSortBy] = useState("match"); // "match", "deadline", "company"
  const [availableFilters, setAvailableFilters] = useState<string[]>([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationSeverity, setNotificationSeverity] = useState<
    "success" | "error" | "info" | "warning"
  >("info");
  const [analysisOpen, setAnalysisOpen] = useState(false);

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
  }, [selectedInterest, statusFilter, matchFilter, sortBy, searchQuery, internships]);

  const handleOpenAnalysis = () => {
    setAnalysisOpen(true);
  };

  const handleCloseAnalysis = () => {
    setAnalysisOpen(false);
  };

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
    <div className="min-h-screen bg-[#f8fafc]">
      <DashboardHeader 
        userProfile={userProfile} 
        onOpenAnalysis={handleOpenAnalysis} 
      />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <Stack spacing={6} className="mb-12">
          <div className="w-full">
            <Input
              placeholder="Search internships by company, role, or field..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<FiSearch className="w-5 h-5" />}
              className="bg-white shadow-sm border-slate-100 h-14"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-wrap gap-2.5">
              {availableFilters.map((filter) => (
                <Button
                  key={filter}
                  variant={selectedInterest === filter ? "solid" : "outline"}
                  size="sm"
                  onClick={() => setSelectedInterest(filter)}
                  className="px-6 rounded-xl text-xs font-bold transition-all duration-300"
                >
                  {filter}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 items-center flex-grow sm:flex-grow-0">
               <div className="w-full sm:w-[150px]">
                 <Select 
                   value={statusFilter}
                   onChange={(e) => setStatusFilter(e.target.value)}
                   options={[
                     { value: "All", label: "Any Status" },
                     { value: "Applied", label: "Pending App" },
                     { value: "Accepted", label: "Approved" },
                     { value: "Rejected", label: "Denied" },
                     { value: "None", label: "Not Applied" },
                   ]}
                   className="h-11 text-xs shadow-sm border-slate-100 rounded-xl"
                 />
               </div>
               <div className="w-full sm:w-[150px]">
                 <Select 
                   value={matchFilter}
                   onChange={(e) => setMatchFilter(e.target.value)}
                   options={[
                     { value: "All", label: "Any Match" },
                     { value: "70", label: "70%+ Match" },
                     { value: "40", label: "40%+ Match" },
                   ]}
                   className="h-11 text-xs shadow-sm border-slate-100 rounded-xl"
                 />
               </div>
               <div className="w-full sm:w-[150px]">
                 <Select 
                   value={sortBy}
                   onChange={(e) => setSortBy(e.target.value)}
                   options={[
                     { value: "match", label: "Best Match" },
                     { value: "deadline", label: "Soonest Deadline" },
                     { value: "company", label: "Company (A-Z)" },
                   ]}
                   className="h-11 text-xs shadow-sm border-slate-100 rounded-xl"
                 />
               </div>
            </div>
          </div>
        </Stack>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredInternships.length > 0 ? (
            filteredInternships.map((internship, index) => (
              <div 
                key={internship.id}
                className="animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <InternshipCard internship={internship} />
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiSearch className="w-10 h-10 text-slate-300" />
              </div>
              <Typography variant="h5" color="muted">
                No internships found. Try adjusting your filters.
              </Typography>
            </div>
          )}
        </div>
      </main>

      <Modal
        isOpen={analysisOpen}
        onClose={handleCloseAnalysis}
        title="CV Analysis & Match Results"
        size="lg"
        footer={<Button onClick={handleCloseAnalysis}>Close</Button>}
      >
        {internships.length === 0 ? (
          <Typography color="muted" className="text-center py-10">
            No internships available for analysis.
          </Typography>
        ) : (
          <Stack spacing={8}>
            {internships.map((internship) => (
              <div key={internship.id} className="group">
                <Stack direction="row" justify="between" align="center" className="mb-4">
                  <div>
                    <Typography variant="h5" weight="bold" className="group-hover:text-[#667eea] transition-colors">
                      {internship.role}
                    </Typography>
                    <Typography variant="body2" color="muted">
                      {internship.company}
                    </Typography>
                  </div>

                  {internship.matchPercentage !== undefined ? (
                    <Badge 
                      variant={getMatchColor(internship.matchPercentage)}
                      className="px-4 py-1.5 rounded-xl font-bold"
                    >
                      {internship.matchPercentage}% Match
                    </Badge>
                  ) : (
                    <Badge variant="slate" className="px-4 py-1.5 rounded-xl">Not analyzed</Badge>
                  )}
                </Stack>

                {internship.matchPercentage !== undefined && (
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ease-out ${
                        internship.matchPercentage >= 70 ? 'bg-emerald-500' : 
                        internship.matchPercentage >= 40 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${internship.matchPercentage}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </Stack>
        )}
      </Modal>

      {notificationOpen && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-300 z-[100] border ${
          notificationSeverity === "success" 
            ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
            : "bg-red-50 text-red-700 border-red-100"
        }`}>
          <Typography variant="body2" weight="bold">{notificationMessage}</Typography>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
