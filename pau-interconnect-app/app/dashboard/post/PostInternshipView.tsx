"use client";

import { useState } from "react";
import {
  Box,
  TextField,
  Typography,
  Stack,
  Button,
  MenuItem,
  Chip
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

const categories = [
  "Technology",
  "Finance",
  "Consulting",
  "Healthcare",
  "Design",
  "Marketing"
];

const interestsOptions = [
  "Software Development", "Data Science", "Engineering", "Business",
  "Consulting", "Finance", "Design", "Marketing",
  "Research", "Healthcare", "UX/UI", "Product Management",
  "Analytics", "Machine Learning"
];

export default function PostInternshipView() {
  const [interests, setInterests] = useState<string[]>([]);
  const [deadline, setDeadline] = useState<Date | null>(null);

  const toggleInterest = (item: string) => {
    setInterests(prev =>
      prev.includes(item)
        ? prev.filter(i => i !== item)
        : [...prev, item]
    );
  };

  return (
    <Box
      sx={{
        background: "#fff",
        borderRadius: "12px",
        p: 4,
        mt: 3,
        border: "1px solid #e5e7eb"
      }}
    >
      <Typography fontSize={18} fontWeight={700} mb={3}>
        + Post New Internship
      </Typography>

      {/* Top Half */}
      <Stack direction={{ xs: "column", md: "row" }} gap={2}>
        <TextField label="Company Name *" fullWidth />
        <TextField label="Role Title *" fullWidth />
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} gap={2} mt={2}>
        <TextField label="Field *" fullWidth />
        <TextField label="Category *" select fullWidth>
          {categories.map(cat => (
            <MenuItem key={cat} value={cat}>{cat}</MenuItem>
          ))}
        </TextField>
      </Stack>

      <TextField
        label="Description *"
        fullWidth
        multiline
        rows={3}
        sx={{ mt: 2 }}
      />

      <TextField
        label="Requirements * (One per line)"
        fullWidth
        multiline
        rows={3}
        sx={{ mt: 2 }}
      />

      {/* Interests */}
      <Box mt={3}>
        <Typography fontSize={14} mb={1}>
          Related Interests * (Select at least one)
        </Typography>

        <Stack
          direction="row"
          flexWrap="wrap"
          gap={1.5}
        >
          {interestsOptions.map(option => (
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

      <Stack direction={{ xs: "column", md: "row" }} gap={2} mt={3}>
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
          p: 1.5
        }}
      >
        Post Internship
      </Button>
    </Box>
  );
}