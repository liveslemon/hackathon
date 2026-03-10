"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import {
  Box,
  Stack,
  Typography,
  Button,
  Chip,
  Card,
  Divider,
  Modal,
  TextField,
  CircularProgress,
  List,
  ListItem,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from "@mui/material";
import Link from "next/link";

// Icons
import WorkIcon from "@mui/icons-material/Work";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";

export default function InternshipDetailsPage() {
  const params = useParams();
  const internshipId = params?.id as string;

  // --- DATA STATES ---
  const [internship, setInternship] = useState<any>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // --- MODAL & ACTION STATES ---
  const [isApplyModalOpen, setApplyModalOpen] = useState(false);
  const [isCvReviewModalOpen, setCvReviewModalOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- FETCH REAL DATA FROM SUPABASE ---
  useEffect(() => {
    async function fetchInternshipData() {
      if (!internshipId) return;

      try {
        const { data, error } = await supabase
          .from("internships")
          .select("*")
          .eq("id", internshipId)
          .single();

        if (error) throw error;
        setInternship(data);
      } catch (error) {
        console.error("Error fetching internship details:", error);
      } finally {
        setIsPageLoading(false);
      }
    }

    fetchInternshipData();
  }, [internshipId]);

  // --- HANDLERS ---
  const handleApply = async () => {
    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) {
        alert("Please sign in to apply.");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from("applications")
        .insert([
          {
            user_id: userId,
            internship_id: internship.id,
            cover_letter: coverLetter,
          },
        ]);

      if (error) throw error;

      setApplyModalOpen(false);
      alert("Application submitted successfully!");
    } catch (error: any) {
      console.error("Application error:", error);
      alert(error?.message || "Failed to submit application.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCvReview = async () => {
    setCvReviewModalOpen(true);
    setIsReviewing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsReviewing(false);
  };

  // --- LOADING & FALLBACK STATES ---
  if (!mounted) return null;

  if (isPageLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="50vh"
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!internship) {
    return (
      <Box textAlign="center" py={10}>
        <Typography variant="h3">Internship not found</Typography>
        <Typography variant="body1" mt={1}>
          The internship you are looking for does not exist or has been removed.
        </Typography>
      </Box>
    );
  }

  const requirementsList = Array.isArray(internship.requirements)
    ? internship.requirements
    : internship.requirements?.split("\n") || [];

  const responsibilitiesList = Array.isArray(internship.responsibilities)
    ? internship.responsibilities
    : internship.responsibilities?.split("\n") || [];

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 2, md: 4 } }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems="flex-start"
        spacing={3}
        mb={4}
      >
        <Box>
          <Typography variant="h3" fontWeight="bold" mb={1}>
            {internship.role || internship.title}
          </Typography>
          <Typography variant="h5" color="text.secondary" mb={2}>
            {internship.company}
          </Typography>

          <Stack direction="row" flexWrap="wrap" gap={1}>
            <Chip
              icon={<WorkIcon />}
              label={internship.category || internship.field || "Internship"}
              variant="outlined"
            />
            <Chip
              icon={<LocationOnIcon />}
              label={internship.location || "Remote / Undefined"}
              variant="outlined"
            />
            {internship.duration && (
              <Chip
                icon={<AccessTimeIcon />}
                label={internship.duration}
                variant="outlined"
              />
            )}
          </Stack>
        </Box>

        <Stack spacing={1.5} sx={{ width: { xs: "100%", md: "auto" } }}>
          <Button
            size="large"
            variant="contained"
            endIcon={<SendIcon />}
            onClick={() => setApplyModalOpen(true)}
          >
            Apply Now
          </Button>
          <Button
            size="large"
            variant="outlined"
            color="success"
            startIcon={<AutoAwesomeIcon />}
            onClick={handleCvReview}
          >
            Review & Tailor CV
          </Button>
          <Link href="/dashboard/student" passHref>
            <Button size="large" variant="outlined" color="secondary">
              Back to Dashboard
            </Button>
          </Link>

          <Typography
            variant="body2"
            textAlign="center"
            fontWeight="bold"
            color={
              (internship.matchPercentage || 0) >= 70 ? "success.main" : "warning.main"
            }
          >
            {(internship.matchPercentage || 0)}% Profile Match
          </Typography>
        </Stack>
      </Stack>

      <Divider sx={{ mb: 4 }} />

      <Stack spacing={4}>
        <section>
          <Typography variant="h4" fontWeight="bold" mb={2}>
            About the Role
          </Typography>
          <Typography variant="body1" color="text.secondary" lineHeight={1.7}>
            {internship.description || "No description provided."}
          </Typography>
        </section>

        {requirementsList.length > 0 && (
          <section>
            <Typography variant="h4" fontWeight="bold" mb={2}>
              Requirements
            </Typography>
            <List sx={{ pl: 3, color: "text.secondary" }}>
              {requirementsList.map((req: string, idx: number) => (
                <ListItem key={idx} sx={{ display: "list-item", listStyleType: "disc" }}>{req}</ListItem>
              ))}
            </List>
          </section>
        )}

        {responsibilitiesList.length > 0 && (
          <section>
            <Typography variant="h4" fontWeight="bold" mb={2}>
              Responsibilities
            </Typography>
            <List sx={{ pl: 3, color: "text.secondary" }}>
              {responsibilitiesList.map((res: string, idx: number) => (
                <ListItem key={idx} sx={{ display: "list-item", listStyleType: "disc" }}>{res}</ListItem>
              ))}
            </List>
          </section>
        )}
      </Stack>

      <Dialog open={isApplyModalOpen} onClose={() => !isSubmitting && setApplyModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Apply for {internship.role || internship.title}
          <IconButton
            aria-label="close"
            onClick={() => setApplyModalOpen(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Include a short cover letter. Tell {internship.company} why you're a great fit.
          </Typography>
          <TextField
            multiline
            rows={6}
            fullWidth
            placeholder="Dear Hiring Manager..."
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            disabled={isSubmitting}
          />
        </DialogContent>
        <Stack direction="row" justifyContent="space-between" p={3}>
          <Button variant="outlined" startIcon={<AutoAwesomeIcon />}>
            Draft with AI
          </Button>
          <Button onClick={handleApply} disabled={isSubmitting} variant="contained" endIcon={<SendIcon />}>
            {isSubmitting ? <CircularProgress size={24} /> : "Submit Application"}
          </Button>
        </Stack>
      </Dialog>

      <Dialog open={isCvReviewModalOpen} onClose={() => !isReviewing && setCvReviewModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <AutoAwesomeIcon sx={{ color: "success.main", mr: 1 }} />
          AI CV Review
          <IconButton
            aria-label="close"
            onClick={() => setCvReviewModalOpen(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Comparing your uploaded profile against this job description...
          </Typography>

          {isReviewing ? (
            <Stack alignItems="center" py={4} spacing={2}>
              <CircularProgress size={60} color="success" />
              <Typography variant="body2">Analyzing keywords and experience...</Typography>
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Card sx={{ bgcolor: "success.light", p: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                  Looking Good!
                </Typography>
                <Typography variant="body2">
                  Your profile strongly correlates with the key requirements for {internship.role || internship.title}.
                </Typography>
              </Card>
              
              <Card sx={{ bgcolor: "warning.light", p: 2 }}>
                <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                  Actionable Tips
                </Typography>
                <List sx={{ pl: 2, listStyleType: "circle" }}>
                  <ListItem sx={{ display: "list-item", fontSize: "0.875rem" }}>Make sure you highlight any projects related to the core responsibilities.</ListItem>
                  <ListItem sx={{ display: "list-item", fontSize: "0.875rem" }}>Consider adding a bullet point about {internship.category || "this field"}.</ListItem>
                </List>
              </Card>

              <Button fullWidth onClick={() => setCvReviewModalOpen(false)} sx={{ mt: 2 }}>
                Got it, let's update my CV
              </Button>
            </Stack>
          )}
        </DialogContent>
      </Dialog>

    </Box>
  );
}
