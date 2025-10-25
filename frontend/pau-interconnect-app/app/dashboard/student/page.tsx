"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiLogOut, FiSearch, FiUser, FiBell } from "react-icons/fi";
import { supabase } from "@/lib/supabaseClient";
import {
  Button,
  TextField,
  Box,
  Stack,
  Typography,
  CircularProgress,
  Snackbar,
  Alert,
  Fade,
  Slide,
  SlideProps,
} from "@mui/material";
import InternshipCard from "@/components/InternshipCard";

interface Internship {
  id: string;
  company: string;
  role: string;
  field: string;
  category: string;
  description: string;
  deadline: string;
  interests: string[];
  matchPercentage?: number;
}

function SlideDownTransition(props: SlideProps) {
  return <Slide {...props} direction="down" />;
}

interface NotificationBarProps {
  open: boolean;
  message: string;
  severity: "success" | "error" | "info" | "warning";
  onClose: () => void;
}

const NotificationBar = ({
  open,
  message,
  severity,
  onClose,
}: NotificationBarProps) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={onClose}
      TransitionComponent={SlideDownTransition}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      <Alert
        onClose={onClose}
        severity={severity}
        icon={<FiBell />}
        sx={{ width: "100%" }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

const Dashboard = () => {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [filteredInternships, setFilteredInternships] = useState<Internship[]>(
    []
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success"
  );
  const [loading, setLoading] = useState(true);
  const [availableFilters, setAvailableFilters] = useState<string[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationSeverity, setNotificationSeverity] = useState<
    "success" | "error" | "info" | "warning"
  >("info");

  const router = useRouter();

  const handleSnackbarClose = () => setSnackbarOpen(false);
  const handleNotificationClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setNotificationOpen(false);
  };

  // Parse internship interests safely
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
    const checkAuthAndLoadData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/login/student");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profile) {
        router.push("/login/student");
        return;
      }

      setUserProfile(profile);

      try {
        setIsAnalyzing(true);
        const { data: internshipsData, error: internshipsError } =
          await supabase.from("internships").select("*");

        if (internshipsError || !internshipsData) {
          console.error(
            "Failed to fetch internships from Supabase",
            internshipsError
          );
          setInternships([]);
          setFilteredInternships([]);
          setIsAnalyzing(false);
          setLoading(false);
          return;
        }

        const data: Internship[] = internshipsData;

        // Safely parse profile.interests if it's a string or array
        let parsedInterests: string[] = [];
        if (Array.isArray(profile.interests)) {
          parsedInterests = (profile.interests as unknown[]).filter(
  (i): i is string => typeof i === "string"
);
        } else if (typeof profile.interests === "string") {
          try {
            const parsed = JSON.parse(profile.interests);
            if (Array.isArray(parsed)) {
              parsedInterests = parsed.filter((i) => typeof i === "string");
            }
          } catch {
            // fallback to empty array
            parsedInterests = [];
          }
        }

        const cvText =
          profile.cvLink ||
          `Student studying ${
            profile.course
          } interested in ${parsedInterests.join(", ")}`;

        const internshipsWithMatches = await Promise.all(
          data.map(async (internship) => {
            try {
              const { data: matchData } = await supabase.functions.invoke(
                "analyze-cv-match",
                { body: { cvText, internship } }
              );
              return {
                ...internship,
                matchPercentage: matchData.matchPercentage,
              };
            } catch {
              return { ...internship, matchPercentage: undefined };
            }
          })
        );

        console.log("Fetched internships with matches:", internshipsWithMatches);

        setInternships(internshipsWithMatches);
        setFilteredInternships(internshipsWithMatches);
        setIsAnalyzing(false);
        setLoading(false);

        // Trigger notification bar for new internships loaded
        if (internshipsWithMatches.length > 0) {
          setNotificationCount(internshipsWithMatches.length);
          setNotificationMessage(
            `Loaded ${internshipsWithMatches.length} new internship${
              internshipsWithMatches.length > 1 ? "s" : ""
            }`
          );
          setNotificationSeverity("success");
          setNotificationOpen(true);
        }
      } catch (error) {
        console.error("Error loading internships:", error);
        setInternships([]);
        setFilteredInternships([]);
        setIsAnalyzing(false);
        setLoading(false);
      }
    };

    checkAuthAndLoadData();
  }, [router]);

  // Setup available filters based on userProfile.interests
  useEffect(() => {
    if (userProfile?.interests) {
      let interests: string[] = [];
      if (Array.isArray(userProfile.interests)) {
        interests = userProfile.interests.filter((i) => typeof i === "string");
      } else if (typeof userProfile.interests === "string") {
        try {
          const parsed = JSON.parse(userProfile.interests);
          if (Array.isArray(parsed)) {
            interests = parsed.filter((i) => typeof i === "string");
          }
        } catch {
          interests = [];
        }
      }

      setAvailableFilters(["All", ...interests]);
      if (interests.length > 0) {
        setSelectedFilter("All");
      } else {
        setSelectedFilter("All");
      }
    } else {
      setAvailableFilters(["All"]);
      setSelectedFilter("All");
    }
  }, [userProfile]);

  // Filtering internships based on selectedFilter and searchQuery
  useEffect(() => {
    setFilteredInternships(() => {
      let filtered = internships;

      if (selectedFilter !== "All") {
        filtered = filtered.filter((internship) =>
          getInternshipInterests(internship).some(
            (i: string) => i.toLowerCase() === selectedFilter.toLowerCase()
          )
        );
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (internship) =>
            (internship.company && internship.company.toLowerCase().includes(query)) ||
            (internship.role && internship.role.toLowerCase().includes(query)) ||
            (internship.field && internship.field.toLowerCase().includes(query))
        );
      }

      console.log("Filtered internships:", filtered);
      return filtered;
    });
  }, [selectedFilter, searchQuery, internships]);

  const handleLogout = () => {
    localStorage.clear();
    setNotificationMessage("Logged out successfully");
    setNotificationSeverity("success");
    setNotificationOpen(true);
    router.push("/");
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <NotificationBar
        open={notificationOpen}
        message={notificationMessage}
        severity={notificationSeverity}
        onClose={handleNotificationClose}
      />
      {/* Header */}
      <Box
        component="header"
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "blur(8px)",
          backgroundColor: "rgba(255,255,255,0.8)",
        }}
      >
        <Box maxWidth="lg" mx="auto" px={{ xs: 2, sm: 3, lg: 4 }} py={2}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography variant="h5" fontWeight="bold" color="text.primary">
                PAU InterConnect
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.5}>
                Welcome back, {userProfile?.name?.split(" ")[0]}!
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                variant="outlined"
                size="small"
                onClick={() => router.push("/profile")}
                sx={{ minWidth: 0, p: 1 }}
              >
                <FiUser size={20} />
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={handleLogout}
                sx={{ minWidth: 0, p: 1 }}
              >
                <FiLogOut size={20} />
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* Main Content */}
      <Box maxWidth="lg" mx="auto" px={{ xs: 2, sm: 3, lg: 4 }} py={4}>
        {/* Search and Filters */}
        <Stack spacing={3} mb={4}>
          <TextField
            placeholder="Search internships by company, role, or field..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="medium"
            InputProps={{
              startAdornment: (
                <FiSearch
                  style={{
                    marginLeft: 8,
                    marginRight: 8,
                    color: "rgba(0,0,0,0.54)",
                  }}
                />
              ),
            }}
            sx={{ width: "100%" }}
          />

          <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 1 }}>
            {availableFilters.map((filter) => (
              <Button
                key={filter}
                variant={selectedFilter === filter ? "contained" : "outlined"}
                size="small"
                onClick={() => setSelectedFilter(filter)}
                sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
              >
                {filter}
              </Button>
            ))}
          </Stack>
        </Stack>

        {/* Internships Grid */}
        {isAnalyzing && (
          <Box textAlign="center" py={5}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="center"
              color="primary.main"
            >
              <CircularProgress size={20} color="inherit" />
              <Typography variant="body2" fontWeight="medium">
                Analyzing CV matches with AI...
              </Typography>
            </Stack>
          </Box>
        )}

        <Box
          display="grid"
          gridTemplateColumns={{
            xs: "1fr",
            md: "1fr 1fr",
            lg: "repeat(3, 1fr)",
          }}
          gap={3}
          sx={{ animationFillMode: "forwards" }}
        >
          {filteredInternships.length > 0 ? (
            filteredInternships.map((internship, index) => (
              <Fade
                in={true}
                key={internship.id}
                timeout={300}
                style={{ transitionDelay: `${index * 50}ms` }}
              >
                <Box>
                  <InternshipCard internship={internship} />
                </Box>
              </Fade>
            ))
          ) : (
            <Box gridColumn="1 / -1" textAlign="center" py={6}>
              <Typography color="text.secondary" variant="h6">
                No internships found. Try adjusting your filters.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
