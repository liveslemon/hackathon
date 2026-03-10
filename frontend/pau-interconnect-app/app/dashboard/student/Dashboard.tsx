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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Chip,
  Divider,
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
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success",
  );
  const [availableFilters, setAvailableFilters] = useState<string[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationSeverity, setNotificationSeverity] = useState<
    "success" | "error" | "info" | "warning"
  >("info");
  const [analysisOpen, setAnalysisOpen] = useState(false);

  const router = useRouter();

  const handleSnackbarClose = () => setSnackbarOpen(false);
  const handleNotificationClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string,
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setNotificationOpen(false);
  };

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

  useEffect(() => {
    setFilteredInternships(() => {
      let filtered = internships;

      if (selectedFilter !== "All") {
        filtered = filtered.filter((internship) =>
          getInternshipInterests(internship).some(
            (i: string) => i.toLowerCase() === selectedFilter.toLowerCase(),
          ),
        );
      }

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

      return filtered;
    });
  }, [selectedFilter, searchQuery, internships]);

  const handleLogout = () => {
    (async () => {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn("Error signing out:", err);
      }
      localStorage.clear();
      setNotificationMessage("Logged out successfully");
      setNotificationSeverity("success");
      setNotificationOpen(true);
      router.push("/");
    })();
  };

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
      if (internshipsData) {
        const merged = internshipsData.map((internship) => {
          const existing = internships.find((i) => i.id === internship.id);
          return existing?.matchPercentage !== undefined
            ? { ...internship, matchPercentage: existing.matchPercentage }
            : { ...internship, matchPercentage: 0 };
        });

        setInternships(merged);
        setFilteredInternships(merged);
        setNotificationCount(merged.length);
        setNotificationMessage(`Loaded ${merged.length} internships`);
        setNotificationSeverity("success");
      }
    } catch (err) {
      console.warn("Error refreshing data:", err);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <NotificationBar
        open={notificationOpen}
        message={notificationMessage}
        severity={notificationSeverity}
        onClose={handleNotificationClose}
      />
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
                Welcome back,{" "}
                {userProfile?.name?.split(" ")[0] ||
                  userProfile?.email ||
                  "Student"}
                !
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Button
                variant="contained"
                size="small"
                onClick={handleOpenAnalysis}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                View CV Analysis
              </Button>
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

      <Box maxWidth="lg" mx="auto" px={{ xs: 2, sm: 3, lg: 4 }} py={4}>
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
      <Dialog
        open={analysisOpen}
        onClose={handleCloseAnalysis}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle sx={{ fontWeight: "bold" }}>
          CV Analysis & Internship Match
        </DialogTitle>
        <DialogContent dividers>
          {internships.length === 0 ? (
            <Typography color="text.secondary">
              No internships available for analysis.
            </Typography>
          ) : (
            <Stack spacing={3}>
              {internships.map((internship) => (
                <Box key={internship.id}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={1}
                  >
                    <Box>
                      <Typography fontWeight="bold">
                        {internship.role}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {internship.company}
                      </Typography>
                    </Box>

                    {internship.matchPercentage !== undefined ? (
                      <Chip
                        label={`${internship.matchPercentage}% Match`}
                        color={
                          internship.matchPercentage >= 70
                            ? "success"
                            : internship.matchPercentage >= 40
                              ? "warning"
                              : "error"
                        }
                        sx={{ fontWeight: 600 }}
                      />
                    ) : (
                      <Chip label="Not analyzed" variant="outlined" />
                    )}
                  </Stack>

                  {internship.matchPercentage !== undefined && (
                    <LinearProgress
                      variant="determinate"
                      value={internship.matchPercentage}
                      sx={{ height: 8, borderRadius: 5 }}
                    />
                  )}

                  <Divider sx={{ mt: 2 }} />
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAnalysis}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
