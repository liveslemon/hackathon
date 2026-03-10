"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
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
  const [profile, setProfile] = useState<any>({});
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [savedInternships, setSavedInternships] = useState<any[]>([]);
  const [appliedInternships, setAppliedInternships] = useState<any[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      // Load user profile from Supabase (if signed in)
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id ?? null;

        if (userId) {
          // fetch user email from session
          setUserEmail(sessionData?.session?.user?.email ?? null);
          // fetch profile
          const { data: profileRow } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .maybeSingle();
          setProfile(profileRow ?? {});

          // fetch saved internships ids
          const { data: savedRows } = await supabase
            .from("saved_internships")
            .select("internship_id")
            .eq("user_id", userId);

          const savedIds = (savedRows ?? []).map((r: any) => r.internship_id);
          if (savedIds.length > 0) {
            const { data: internshipsData } = await supabase
              .from("internships")
              .select("*")
              .in("id", savedIds);
            setSavedInternships(internshipsData ?? []);
          } else {
            setSavedInternships([]);
          }

          // fetch applied internships ids
          const { data: appliedRows } = await supabase
            .from("applied_internships")
            .select("internship_id")
            .eq("user_id", userId);

          const appliedIds = (appliedRows ?? []).map(
            (r: any) => r.internship_id,
          );
          if (appliedIds.length > 0) {
            const { data: appliedData } = await supabase
              .from("internships")
              .select("*")
              .in("id", appliedIds);
            setAppliedInternships(appliedData ?? []);
          } else {
            setAppliedInternships([]);
          }
        } else {
          // No signed-in user: keep empty lists
          setProfile({});
          setSavedInternships([]);
          setAppliedInternships([]);
        }
      } catch (err) {
        console.error("Error loading profile data:", err);
        setProfile({});
        setSavedInternships([]);
        setAppliedInternships([]);
      } finally {
        setIsProfileLoaded(true);
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id ?? null;

      if (userId) {
        const upsertPayload = {
          id: userId,
          full_name: profile.full_name ?? null,
          course: profile.course ?? null,
          level: profile.level ?? null,
          interests: profile.interests ?? [],
          cv_url: profile.cv_url ?? null,
        };

        const { error } = await supabase
          .from("profiles")
          .upsert(upsertPayload, { returning: "minimal" });

        if (error) {
          console.error("Failed to save profile:", error);
          setSnackbarOpen(true);
        } else {
          setIsEditing(false);
          setSnackbarOpen(true);
        }
      } else {
        // fallback for unsigned users (keep previous behavior)
        localStorage.setItem("userProfile", JSON.stringify(profile));
        setIsEditing(false);
        setSnackbarOpen(true);
      }
    } catch (err) {
      console.error("Error saving profile:", err);
      setSnackbarOpen(true);
    }
  };

  if (!isProfileLoaded) return null;

  const expiringInternships = appliedInternships.filter((internship) => {
    const daysLeft = Math.ceil(
      (new Date(internship.deadline).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24),
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
              id="full_name"
              label="Full Name"
              value={profile.full_name || ""}
              onChange={(e) =>
                setProfile({ ...profile, full_name: e.target.value })
              }
              disabled={!isEditing}
              fullWidth
              sx={{ flex: "1 1 300px" }}
            />
            <TextField
              id="email"
              label="Email"
              value={userEmail || profile.email || ""}
              onChange={(e) => setUserEmail(e.target.value)}
              disabled={true}
              fullWidth
              sx={{ flex: "1 1 300px" }}
            />
          </Box>

          <TextField
            id="course"
            label="Course"
            value={profile.course || ""}
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
                  (1000 * 60 * 60 * 24),
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
