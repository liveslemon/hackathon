"use client";

import { useState } from "react";
import AnalyticsPage from "@/app/dashboard/analytics/page";
import PostInternshipView from "./post/page";
import { Button, Box, Stack, AppBar, Typography, Toolbar, Divider } from "@mui/material";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("analytics");

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3, md: 4 },         
        maxWidth: "1200px",
        mx: "auto",                          
      }}
    >

      <AppBar
        position="static"
        elevation={0}
        sx={{
          background: "transparent",
          color: "black",
          mb: { xs: 2, sm: 3 },              
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", px: 0 }}>
          <Typography
            variant="h6"
            fontWeight="bold"
            sx={{
              fontSize: { xs: "1.1rem", sm: "1.25rem", md: "1.4rem" },
            }}
          >
            Admin Dashboard
          </Typography>

          <Button
            variant="outlined"
            sx={{
              fontSize: { xs: "0.75rem", sm: "0.85rem" },
              px: { xs: 1.5, sm: 2 },
              py: { xs: 0.5, sm: 0.75 },
              borderRadius: "8px",
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Divider variant="fullWidth" />
      {/* Tab Buttons */}
      <Stack
        direction="row"
        spacing={{ xs: 1, sm: 1.5, md: 2 }}   
        sx={{
          flexWrap: "wrap",
          mb: { xs: 2, sm: 3 },
          mt: { xs: 4, sm: 5},
        }}
      >
        <Button
          variant={activeTab === "analytics" ? "contained" : "outlined"}
          onClick={() => setActiveTab("analytics")}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            fontSize: { xs: "0.8rem", sm: "0.9rem" },
            px: { xs: 2, sm: 3 },
            py: { xs: 0.8, sm: 1 },
            borderRadius: "8px",
          }}
        >
          Analytics
        </Button>

        <Button
          variant={activeTab === "post" ? "contained" : "outlined"}
          onClick={() => setActiveTab("post")}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            fontSize: { xs: "0.8rem", sm: "0.9rem" },
            px: { xs: 2, sm: 3 },
            py: { xs: 0.8, sm: 1 },
            borderRadius: "8px",
          }}
        >
          Post Internship
        </Button>
      </Stack>

      {/* Page Content */}
      <Box
        mt={{ xs: 2, sm: 3 }}
        sx={{
          position: "relative",
          overflow: "hidden",
          animation: "fadeIn 0.3s ease-in-out",
        }}
      >
        {activeTab === "analytics" && (
          <Box sx={{ animation: "fadeIn 0.3s ease-in-out" }}>
            <AnalyticsPage />
          </Box>
        )}

        {activeTab === "post" && (
          <Box sx={{ animation: "fadeIn 0.3s ease-in-out" }}>
            <PostInternshipView />
          </Box>
        )}
      </Box>
    </Box>
  );
}