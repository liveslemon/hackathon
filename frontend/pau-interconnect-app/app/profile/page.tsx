"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import TextareaAutosize from "@mui/material/TextareaAutosize";
import Chip from "@mui/material/Chip";
import Card from "@mui/material/Card";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import {
  FiArrowLeft,
  FiEdit2,
  FiSave,
  FiBriefcase,
  FiHeart,
  FiCalendar,
} from "react-icons/fi";
import InternshipCard from "@/components/InternshipCard";

const Profile = () => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [savedInternships, setSavedInternships] = useState<any[]>([]);
  const [appliedInternships, setAppliedInternships] = useState<any[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    setProfile(userProfile);

    fetch("/internships.json")
      .then((res) => res.json())
      .then((data) => {
        const saved = JSON.parse(
          localStorage.getItem("savedInternships") || "[]"
        );
        const applied = JSON.parse(
          localStorage.getItem("appliedInternships") || "[]"
        );

        setSavedInternships(data.filter((i: any) => saved.includes(i.id)));
        setAppliedInternships(data.filter((i: any) => applied.includes(i.id)));
      });
  }, []);

  const handleSave = () => {
    localStorage.setItem("userProfile", JSON.stringify(profile));
    setIsEditing(false);
    setSnackbarOpen(true);
  };

  if (!profile) return null;

  const expiringInternships = appliedInternships.filter((internship) => {
    const daysLeft = Math.ceil(
      (new Date(internship.deadline).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return daysLeft > 0 && daysLeft <= 7;
  });

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        py: 4,
        px: { xs: 2, sm: 4, md: 8 },
      }}
    >
      <Button
        variant="text"
        startIcon={<FiArrowLeft />}
        onClick={() => router.push("/dashboard/student")}
        sx={{ mb: 4 }}
      >
        Back to Dashboard
      </Button>

      {/* Profile Section */}
      <Card sx={{ p: 4, mb: 6 }}>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={4}
        >
          <Typography variant="h4" component="h1" color="text.primary">
            My Profile
          </Typography>
          {!isEditing ? (
            <Button
              variant="contained"
              startIcon={<FiEdit2 />}
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </Button>
          ) : (
            <Button
              variant="contained"
              startIcon={<FiSave />}
              onClick={handleSave}
            >
              Save Changes
            </Button>
          )}
        </Box>

        <Box
          component="form"
          noValidate
          autoComplete="off"
          sx={{ display: "flex", flexDirection: "column", gap: 3 }}
        >
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            <TextField
              id="name"
              label="Full Name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              disabled={!isEditing}
              fullWidth
              sx={{ flex: "1 1 300px" }}
            />
            <TextField
              id="email"
              label="Email"
              value={profile.email}
              onChange={(e) =>
                setProfile({ ...profile, email: e.target.value })
              }
              disabled={!isEditing}
              fullWidth
              sx={{ flex: "1 1 300px" }}
            />
          </Box>

          <TextField
            id="course"
            label="Course"
            value={profile.course}
            onChange={(e) => setProfile({ ...profile, course: e.target.value })}
            disabled={!isEditing}
            fullWidth
          />

          <Box>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              Career Interests
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {profile.interests?.map((interest: string) => (
                <Chip key={interest} label={interest} color="secondary" />
              ))}
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              Upload CV
            </Typography>
            <Button variant="outlined" component="label" disabled={!isEditing}>
              {profile.cvFile ? profile.cvFile.name : "Upload CV"}
              <input
                type="file"
                hidden
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setProfile({ ...profile, cvFile: file });
                }}
              />
            </Button>
          </Box>
        </Box>
      </Card>

      {/* Deadline Reminders */}
      {expiringInternships.length > 0 && (
        <Card
          sx={{
            p: 3,
            mb: 6,
            bgcolor: "secondary.light",
            border: "1px solid",
            borderColor: "secondary.main",
          }}
        >
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <FiCalendar size={20} color="#1976d2" />
            <Typography variant="h6" color="text.primary">
              Upcoming Deadlines
            </Typography>
          </Box>
          <Stack spacing={2}>
            {expiringInternships.map((internship) => {
              const daysLeft = Math.ceil(
                (new Date(internship.deadline).getTime() -
                  new Date().getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              return (
                <Box
                  key={internship.id}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  p={2}
                  bgcolor="background.paper"
                  borderRadius={1}
                  sx={{ cursor: "default" }}
                >
                  <Typography fontWeight={500} color="text.primary">
                    {internship.role} at {internship.company}
                  </Typography>
                  <Chip label={`${daysLeft} days left`} color="error" />
                </Box>
              );
            })}
          </Stack>
        </Card>
      )}

      {/* Saved Internships */}
      <Box mb={6}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <FiHeart size={20} color="#e53935" />
          <Typography variant="h6" color="text.primary">
            Saved Internships ({savedInternships.length})
          </Typography>
        </Box>
        {savedInternships.length > 0 ? (
          <Stack spacing={2}>
            {savedInternships.map((internship) => (
              <InternshipCard key={internship.id} internship={internship} />
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary">
            No saved internships yet
          </Typography>
        )}
      </Box>

      {/* Applied Internships */}
      <Box mb={6}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <FiBriefcase size={20} color="#1976d2" />
          <Typography variant="h6" color="text.primary">
            Applied Internships ({appliedInternships.length})
          </Typography>
        </Box>
        {appliedInternships.length > 0 ? (
          <Stack spacing={2}>
            {appliedInternships.map((internship) => (
              <InternshipCard key={internship.id} internship={internship} />
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary">No applications yet</Typography>
        )}
      </Box>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{ width: "100%" }}
        >
          Profile updated - Your changes have been saved
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Profile;
