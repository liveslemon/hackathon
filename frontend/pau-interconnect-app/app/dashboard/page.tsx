"use client";

import { useState } from "react";
import AnalyticsPage from "@/app/dashboard/analytics/page";
import PostInternshipView from "./post/PostInternshipView";
import { Button, Box, Stack, AppBar, Typography, Toolbar } from "@mui/material";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("analytics");

  return (
    <Box p={3}>
              <AppBar position="static" elevation={0} sx={{ background: "transparent", color: "black" }}>
                <Toolbar sx={{ justifyContent: "space-between" }}>
                  <Typography variant="h6" fontWeight="bold">
                    Admin Dashboard
                  </Typography>
                  <Button variant="outlined">Logout</Button>
                </Toolbar>
              </AppBar>
        
      <Stack direction="row" gap={2}>
        <Button
          variant={activeTab === "analytics" ? "contained" : "outlined"}
          onClick={() => setActiveTab("analytics")}
        >
          Analytics
        </Button>

        <Button
          variant={activeTab === "post" ? "contained" : "outlined"}
          onClick={() => setActiveTab("post")}
        >
          Post Internship
        </Button>
      </Stack>

      <Box mt={4} sx={{ position: "relative", overflow: "hidden" }}>
        {activeTab === "analytics" && (
          <Box sx={{ animation: "fadeIn 0.3s" }}>
            < AnalyticsPage/>
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