"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AnalyticsPage from "@/app/dashboard/analytics/page";
import PostInternshipView from "./post/PostInternshipView";
import {
  Button,
  Box,
  Stack,
  AppBar,
  Typography,
  Toolbar,
  CircularProgress,
} from "@mui/material";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("analytics");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.push("/");
        return;
      }

      setLoading(false);
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backdropFilter: "blur(12px)",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      p={3}
      sx={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))",
        backdropFilter: "blur(12px)",
        borderRadius: 3,
        color: "#111",
      }}
    >
      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(12px)",
          color: "#111",
          mb: 3,
          borderRadius: 2,
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between" }}>
          <Typography variant="h6" fontWeight="bold">
            Admin Dashboard
          </Typography>
          <Button
            variant="outlined"
            href="/"
            sx={{
              color: "#111",
              borderColor: "rgba(0,0,0,0.2)",
              "&:hover": {
                bgcolor: "rgba(0,0,0,0.05)",
              },
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Stack direction="row" gap={2} mb={3}>
        <Button
          variant={activeTab === "analytics" ? "contained" : "outlined"}
          onClick={() => setActiveTab("analytics")}
          sx={{
            bgcolor:
              activeTab === "analytics" ? "rgba(0,0,0,0.1)" : "transparent",
            color: "#111",
            "&:hover": { bgcolor: "rgba(0,0,0,0.15)" },
          }}
        >
          Analytics
        </Button>
        <Button
          variant={activeTab === "post" ? "contained" : "outlined"}
          onClick={() => setActiveTab("post")}
          sx={{
            bgcolor: activeTab === "post" ? "rgba(0,0,0,0.1)" : "transparent",
            color: "#111",
            "&:hover": { bgcolor: "rgba(0,0,0,0.15)" },
          }}
        >
          Post Internship
        </Button>
      </Stack>

      <Box mt={4} sx={{ position: "relative", overflow: "hidden" }}>
        {activeTab === "analytics" && (
          <Box sx={{ animation: "fadeIn 0.3s" }}>
            <AnalyticsPage />
          </Box>
        )}
        {activeTab === "post" && (
          <Box sx={{ animation: "fadeIn 0.3s" }}>
            <PostInternshipView />
          </Box>
        )}
      </Box>
    </Box>
  );
}
