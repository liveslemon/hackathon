"use client";

import { useState } from "react";
import {
  Box,
  TextField,
  Typography,
  Stack,
  Button,
  MenuItem,
  Chip,
  Snackbar,
  Alert,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { supabase } from "@/lib/supabaseClient";

const categories = [
  "Technology",
  "Finance",
  "Consulting",
  "Healthcare",
  "Design",
  "Marketing",
];

const interestsOptions = [
  "Software Development",
  "Data Science",
  "Engineering",
  "Business",
  "Consulting",
  "Finance",
  "Design",
  "Marketing",
  "Research",
  "Healthcare",
  "UX/UI",
  "Product Management",
  "Analytics",
  "Machine Learning",
];

export default function PostInternshipView() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [field, setField] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [linkedin, setLinkedin] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "info" | "warning"
  >("success");

  const toggleInterest = (item: string) => {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleSnackbarClose = () => setSnackbarOpen(false);

  const handlePostInternship = async () => {
    // Basic validation
    if (
      !company ||
      !role ||
      !field ||
      !category ||
      !description ||
      !requirements ||
      !deadline ||
      interests.length === 0
    ) {
      setSnackbarMessage(
        "Please fill all required fields and select interests."
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    const { data, error } = await supabase.from("internships").insert([
      {
        company: company,
        role: role,
        field,
        category,
        description,
        requirements: requirements.split("\n"),
        interests,
        deadline: deadline,
        recruiter_linkedin: linkedin || null,
        created_at: new Date(),
      },
    ]);

    if (error) {
      setSnackbarMessage("Failed to post internship. Try again.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      console.error(error);
    } else {
      setSnackbarMessage("Internship posted successfully!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      // Clear form
      setCompany("");
      setRole("");
      setField("");
      setCategory("");
      setDescription("");
      setRequirements("");
      setInterests([]);
      setDeadline(null);
      setLinkedin("");
    }
  };

  return (
    <Box
      sx={{
        background: "#fff",
        borderRadius: "12px",
        p: { xs: 2, sm: 3, md: 4 },
        mt: { xs: 2, sm: 3 },
        border: "1px solid #e5e7eb",
        width: "100%",
        maxWidth: "900px",
        mx: "auto",
      }}
    >
      <Typography
        fontWeight={700}
        mb={3}
        sx={{ fontSize: { xs: 16, sm: 18, md: 20 } }}
      >
        + Post New Internship
      </Typography>

      {/* Top Half */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={{ xs: 1.5, md: 2 }}
      >
        <TextField
          label="Company Name *"
          fullWidth
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
        <TextField
          label="Role Title *"
          fullWidth
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} gap={2} mt={2}>
        <TextField
          label="Field *"
          fullWidth
          value={field}
          onChange={(e) => setField(e.target.value)}
        />
        <TextField
          label="Category *"
          select
          fullWidth
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((cat) => (
            <MenuItem key={cat} value={cat}>
              {cat}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <TextField
        label="Description *"
        fullWidth
        multiline
        rows={3}
        sx={{ mt: 2 }}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <TextField
        label="Requirements * (One per line)"
        fullWidth
        multiline
        rows={3}
        sx={{ mt: 2 }}
        value={requirements}
        onChange={(e) => setRequirements(e.target.value)}
      />

      {/* Interests */}
      <Box mt={3}>
        <Typography fontSize={14} mb={1}>
          Related Interests * (Select at least one)
        </Typography>

        <Stack
          direction="row"
          flexWrap="wrap"
          gap={{ xs: 1, sm: 1.5 }}
          justifyContent={{ xs: "flex-start", sm: "flex-start" }}
        >
          {interestsOptions.map((option) => (
            <Chip
              key={option}
              label={option}
              clickable
              onClick={() => toggleInterest(option)}
              color={interests.includes(option) ? "primary" : "default"}
              variant={interests.includes(option) ? "filled" : "outlined"}
            />
          ))}
        </Stack>
      </Box>

      <Stack
        direction={{ xs: "column", md: "row" }}
        gap={2}
        mt={{ xs: 2, sm: 3 }}
      >
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Application Deadline *"
            value={deadline}
            onChange={(newValue) => setDeadline(newValue)}
            slotProps={{ textField: { fullWidth: true } }}
          />
        </LocalizationProvider>
        <TextField
          label="Recruiter LinkedIn URL"
          fullWidth
          placeholder="https://www.linkedin.com/company/..."
          value={linkedin}
          onChange={(e) => setLinkedin(e.target.value)}
        />
      </Stack>

      <Button
        variant="contained"
        fullWidth
        sx={{
          mt: 3,
          backgroundColor: "#3949ab",
          textTransform: "none",
          fontWeight: 700,
          borderRadius: "8px",
          p: { xs: 1, sm: 1.5 },
          fontSize: { xs: "0.9rem", sm: "1rem" },
        }}
        onClick={handlePostInternship}
      >
        Post Internship
      </Button>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
