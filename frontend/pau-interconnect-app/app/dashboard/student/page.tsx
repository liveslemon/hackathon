"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  Box,
  TextField,
  Grid,
  Button,
  Snackbar,
  Alert,
  Chip,
  CircularProgress,
} from "@mui/material";
import { AiOutlineLogout, AiOutlineUser, AiOutlineSearch } from "react-icons/ai";
import { supabase } from "@/lib/supabaseClient";
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

const Dashboard = () => {
  const router = useRouter();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [filteredInternships, setFilteredInternships] = useState<Internship[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [newInternshipsCount, setNewInternshipsCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "success" | "error" | "warning" | "info",
  });

  useEffect(() => {
    const profile = localStorage.getItem("userProfile");
    if (!profile) {
      router.push("/");
      return;
    }

    setUserProfile(JSON.parse(profile));

    const lastViewedCount = parseInt(localStorage.getItem("lastViewedInternshipCount") || "0");

    fetch("/internships.json")
      .then((res) => res.json())
      .then(async (data: Internship[]) => {
        const newCount = Math.max(0, data.length - lastViewedCount);
        setNewInternshipsCount(newCount);

        const profileData = JSON.parse(profile);
        const cvText =
          profileData.cvLink ||
          `Student studying ${profileData.course} interested in ${profileData.interests?.join(", ")}`;

        setIsAnalyzing(true);
        const internshipsWithMatches = await Promise.all(
          data.map(async (internship) => {
            try {
              const { data: matchData, error } = await supabase.functions.invoke("analyze-cv-match", {
                body: { cvText, internship },
              });

              if (error) throw error;
              return {
                ...internship,
                matchPercentage: matchData.matchPercentage,
              };
            } catch (error) {
              console.error("Error analyzing match:", error);
              return { ...internship, matchPercentage: undefined };
            }
          })
        );
        setIsAnalyzing(false);

        setInternships(internshipsWithMatches);
        setFilteredInternships(internshipsWithMatches);
      })
      .catch((err) => {
        console.error("Error loading internships:", err);
        setIsAnalyzing(false);
      });
  }, [router]);

  useEffect(() => {
    let filtered = internships;

    if (selectedFilter !== "All") {
      filtered = filtered.filter((internship) =>
        internship.interests.includes(selectedFilter)
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (internship) =>
          internship.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
          internship.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
          internship.field.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredInternships(filtered);
  }, [searchQuery, selectedFilter, internships]);

  const handleLogout = () => {
    localStorage.clear();
    setSnackbar({
      open: true,
      message: "Logged out successfully!",
      severity: "success",
    });
    setTimeout(() => router.push("/"), 1000);
  };

  const handleDismissNotification = () => {
    localStorage.setItem("lastViewedInternshipCount", internships.length.toString());
    setNewInternshipsCount(0);
  };

  const filters = ["All", ...(userProfile?.interests || [])];

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fafafa" }}>
      {/* AppBar */}
      <AppBar position="sticky" color="inherit" elevation={1}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              PAU InterConnect
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Welcome back, {userProfile?.name?.split(" ")[0]}!
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Link href="/profile" passHref>
              <IconButton color="primary">
                <AiOutlineUser size={22} />
              </IconButton>
            </Link>
            <IconButton color="primary" onClick={handleLogout}>
              <AiOutlineLogout size={22} />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main */}
      <Container sx={{ py: 5 }}>
        {/* Notification */}
        {newInternshipsCount > 0 && (
          <Alert
            severity="info"
            onClose={handleDismissNotification}
            sx={{ mb: 3 }}
          >
            {newInternshipsCount} new internship(s) have been added since your last visit.
          </Alert>
        )}

        {/* Search */}
        <Box sx={{ position: "relative", mb: 3 }}>
          <AiOutlineSearch
            size={20}
            style={{
              position: "absolute",
              top: "50%",
              left: 12,
              transform: "translateY(-50%)",
              color: "#888",
            }}
          />
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search internships by company, role, or field..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ pl: 4 }}
          />
        </Box>

        {/* Filters */}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 4 }}>
          {filters.map((filter) => (
            <Chip
              key={filter}
              label={filter}
              color={selectedFilter === filter ? "primary" : "default"}
              onClick={() => setSelectedFilter(filter)}
              clickable
            />
          ))}
        </Box>

        {/* Loader */}
        {isAnalyzing && (
          <Box textAlign="center" sx={{ py: 4 }}>
            <CircularProgress size={24} color="primary" />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Analyzing CV matches with AI...
            </Typography>
          </Box>
        )}

        {/* Internship Grid */}
        <Grid container spacing={3}>
          {filteredInternships.length > 0 ? (
            filteredInternships.map((internship, index) => (
              <Grid item xs={12} sm={6} lg={4} key={internship.id}>
                <InternshipCard internship={internship} />
              </Grid>
            ))
          ) : (
            <Grid item xs={12} textAlign="center" sx={{ py: 8 }}>
              <Typography color="text.secondary">
                No internships found. Try adjusting your filters.
              </Typography>
            </Grid>
          )}
        </Grid>
      </Container>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;