"use client"
import React from "react";
import { FaLock } from "react-icons/fa";
import { Box, Button, Card, CardContent, TextField, Typography } from "@mui/material";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="body">
      <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="#f9fafb"
      px={2}
    >
      <Card
        sx={{
          width: { xs: "100%", sm: 380 },
          borderRadius: 3,
          boxShadow: 3,
          textAlign: "center",
          maxWidth: 400,
          p: { xs: 3, sm: 4 },
        }}
      >
        <CardContent>
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            mb={2}
          >
            <Box
              sx={{
                backgroundColor: "#1976d2",
                borderRadius: 2,
                p: 1.5,
                display: "inline-flex",
              }}
            >
              <FaLock size={28} color="white" />
            </Box>
          </Box>

          <Typography variant="h5" fontWeight="bold">
            Admin Portal
          </Typography>
          <Typography color="text.secondary" mb={3}>
            Sign in to manage internship postings
          </Typography>

          <TextField
            label="Email"
            variant="outlined"
            fullWidth
            margin="normal"
            defaultValue="admin@pau.edu.ng"
          />

          <TextField
            label="Password"
            type="password"
            variant="outlined"
            fullWidth
            margin="normal"
          />

          <Button
            variant="contained"
            fullWidth
            sx={{
              mt: 2,
              bgcolor: "#1976d2",
              "&:hover": { bgcolor: "#1259a0ff" },
              borderRadius: 2,
              textTransform: "none",
              fontWeight: "bold",
            }}
          >
            Sign In
          </Button>



                    <Button
            variant="contained"
            fullWidth
            
            sx={{
              mt: 2,
              color:"text.secondary",
              bgcolor: "transparent",
              boxShadow: "none",
              "&:hover": { color: "#FFF", bgcolor: "#4F46E5", boxShadow: "none",},
              borderRadius: 2,
              textTransform: "none",
            }}
          >
            Back to home
          </Button>

          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => router.push("/login/student")}
              sx={{
                textTransform: "none",
                fontSize: "0.875rem",
                borderRadius: 2,
                color: "#1976d2",
                borderColor: "#1976d2",
                "&:hover": { bgcolor: "#1976d2", color: "#fff" },
              }}
            >
              Student Login
            </Button>
          </Box>

   {/*        <Typography
            variant="body2"
            mt={3}
            color="text.secondary"
            sx={{
              cursor: "pointer",
              "&:hover": { color: "#FFF", bgcolor: "#8a2be2"},
            }}
          >
            Back to Home
          </Typography> */}
        </CardContent>
      </Card>
    </Box>
    </div>
  );
}
