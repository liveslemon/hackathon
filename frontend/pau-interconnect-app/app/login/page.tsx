"use client";
import React, {useState} from "react";
import { FaLock } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { Box, Button, Card, CardContent, TextField, Typography } from "@mui/material";



interface AdminAccount {
  email: string;
  password: string;
}

const adminAccounts: AdminAccount[] = [
  { email: "admin@pau.edu.ng", password: "admin123" },
  { email: "supervisor@pau.edu.ng", password: "super456" },
  { email: "head@pau.edu.ng", password: "admin789" },
];

export default function Home() {
    const router = useRouter();
  const [email, setEmail] = useState("admin@pau.edu.ng");
  const [password, setPassword] = useState("");
const [error, setError] = useState("");

 const handleLogin = () => {
  // find an admin account that matches the entered email (if any)
  const admin = adminAccounts.find(a => a.email === email);

  if (admin) {
    if (admin.password === password) {
      router.push("/dashboard/admin");
    } else {
      setError("Invalid password for admin account.");
    }
    return;
  }

  if (email && password) {
    router.push("/dashboard/student");
  } else {
    setError("Please enter your email and password.");
  }
};
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

          <form
  onSubmit={(e) => {
    e.preventDefault(); // prevent page reload
    handleLogin();
  }}
>
  <TextField
    label="Email"
    variant="outlined"
    fullWidth
    margin="normal"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />

  <TextField
    label="Password"
    type="password"
    variant="outlined"
    fullWidth
    margin="normal"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    error={Boolean(error)}
    helperText={error}
  />

  <Button
    type="submit"
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
</form>


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
            onClick={() => router.push("/")}
          >
            Back to home
          </Button>

   {/*      <Typography
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
