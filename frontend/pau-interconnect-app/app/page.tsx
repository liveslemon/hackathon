"use client";
import { Button, Container, Box, Typography } from "@mui/material";
import { useEffect } from "react";
import { MdWork, MdTrendingUp, MdPeople } from "react-icons/md";

const Welcome = () => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        position: "relative",
        overflowY: "auto",
        scrollbarWidth: "thin",
        scrollbarColor: "#888 #f1f1f1",
        "&::-webkit-scrollbar": { width: "8px" },
        "&::-webkit-scrollbar-track": { background: "#f1f1f1" },
        "&::-webkit-scrollbar-thumb": {
          background: "#888",
          borderRadius: "4px",
        },
        "&::-webkit-scrollbar-thumb:hover": { background: "#555" },
      }}
    >
      {/* Navigation */}
      <Box
        component="nav"
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          px: { xs: 2, sm: 3, lg: 4 },
          py: 2,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Button
          variant="outlined"
          href="/login/student"
          sx={{
            bgcolor: "rgba(255, 255, 255, 0.1)",
            color: "white",
            borderColor: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(8px)",
            "&:hover": {
              bgcolor: "rgba(255, 255, 255, 0.2)",
              borderColor: "rgba(255, 255, 255, 0.3)",
            },
          }}
        >
          Sign In
        </Button>
      </Box>

      {/* Hero Section */}
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          bgcolor: "primary.main",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          pt: { xs: 8, sm: 12, md: 16 },
          pb: { xs: 8, sm: 12, md: 16 },
        }}
      >
        <Box
          component="div"
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.2,
            backgroundImage: `url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzBoLTJ2LTJoMnYyem0wLTRoLTJ2LTJoMnYyem0wLTRoLTJ2LTJoMnYyem0wLTRoLTJ2LTJoMnYyem0wLTRoLTJ2LTJoMnYyem0wLTRoLTJ2LTJoMnYyeiIvPjwvZz48L2c+PC9zdmc+")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: "contain",
          }}
        />
        <Container
          maxWidth="lg"
          sx={{
            position: "relative",
            textAlign: "center",
            color: "common.white",
          }}
        >
          <Typography
            variant="h2"
            component="h1"
            fontWeight="bold"
            gutterBottom
            sx={{ mb: 3 }}
          >
            PAU InterConnect
          </Typography>
          <Typography
            variant="h5"
            sx={{ mb: 5, maxWidth: 600, mx: "auto", opacity: 0.9 }}
          >
            Your gateway to meaningful internship opportunities. Connect with
            top companies and launch your career.
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
              justifyContent: "center",
            }}
          >
            <Button
              size="large"
              variant="contained"
              href="/onboarding"
              sx={{ px: 5, py: 2, fontSize: "1.125rem", boxShadow: 3 }}
            >
              Get Started
            </Button>
            <Button
              size="large"
              variant="outlined"
              href="/admin"
              sx={{
                color: "common.white",
                borderColor: "rgba(255, 255, 255, 0.5)",
                backdropFilter: "blur(8px)",
                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.2)",
                  borderColor: "rgba(255, 255, 255, 0.7)",
                },
                px: 5,
                py: 2,
                fontSize: "1.125rem",
              }}
            >
              Admin Portal
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 4,
            alignItems: "stretch",
          }}
        >
          {[ 
            { icon: <MdWork />, title: "Personalized Matches", text: "Get internship recommendations tailored to your course, interests, and career goals." },
            { icon: <MdTrendingUp />, title: "Real Opportunities", text: "Access internships from leading companies across various industries and fields." },
            { icon: <MdPeople />, title: "Easy Application", text: "Apply to multiple internships with your saved profile and track your progress." }
          ].map((feature, i) => (
            <Box
              key={i}
              sx={{
                flex: 1,
                p: 4,
                borderRadius: 3,
                bgcolor: "background.paper",
                boxShadow: 3,
                textAlign: "center",
                transition: "box-shadow 0.3s",
                "&:hover": { boxShadow: 6 },
                height: "100%",
              }}
            >
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 64,
                  height: 64,
                  borderRadius: 3,
                  bgcolor: "primary.main",
                  color: "common.white",
                  mb: 3,
                  mx: "auto",
                  fontSize: 40,
                }}
              >
                {feature.icon}
              </Box>
              <Typography variant="h6" fontWeight="600" gutterBottom>
                {feature.title}
              </Typography>
              <Typography color="text.secondary">{feature.text}</Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
};

export default Welcome;