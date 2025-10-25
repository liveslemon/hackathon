"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // use this instead of react-router-dom
import {
  Card,
  CardContent,
  CardActions,
  CardHeader,
  Button,
  Chip,
  IconButton,
  Typography,
  Box,
} from "@mui/material";
import { MdFavorite, MdCalendarMonth, MdBusiness } from "react-icons/md"; // React Icons (Material Design)
import { Snackbar, Alert } from "@mui/material";

import InternshipDetails from "@/components/InternshipDetails";

interface InternshipCardProps {
  internship: {
    id: string;
    company: string;
    role: string;
    field: string;
    category: string;
    deadline: string;
    matchPercentage?: number;
  };
}

const InternshipCard = ({ internship }: InternshipCardProps) => {
  const [isSaved, setIsSaved] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });
  const [openDetails, setOpenDetails] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("savedInternships") || "[]");
    setIsSaved(saved.includes(internship.id));
  }, [internship.id]);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    const saved = JSON.parse(localStorage.getItem("savedInternships") || "[]");

    if (isSaved) {
      const updated = saved.filter((id: string) => id !== internship.id);
      localStorage.setItem("savedInternships", JSON.stringify(updated));
      setIsSaved(false);
      setSnackbar({ open: true, message: "Removed from saved" });
    } else {
      saved.push(internship.id);
      localStorage.setItem("savedInternships", JSON.stringify(saved));
      setIsSaved(true);
      setSnackbar({ open: true, message: "Saved successfully!" });
    }
  };

  const handleCloseSnackbar = () => setSnackbar({ open: false, message: "" });

  const daysUntilDeadline = Math.ceil(
    (new Date(internship.deadline).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
  );

  const getMatchColor = (percentage?: number) => {
    if (!percentage) return "text.secondary";
    if (percentage >= 80) return "success.main";
    if (percentage >= 60) return "primary.main";
    if (percentage >= 40) return "warning.main";
    return "text.secondary";
  };

  return (
    <>
      <Card
        sx={{
          borderRadius: 3,
          boxShadow: 3,
          p: 2,
          cursor: "pointer",
          position: "relative",
          transition: "transform 0.2s ease",
          "&:hover": { transform: "scale(1.02)", boxShadow: 6 },
        }}
        onClick={() => setOpenDetails(true)}
      >
        {/* Match Badge */}
        {internship.matchPercentage !== undefined && (
          <Chip
            label={`${internship.matchPercentage}% Match`}
            size="small"
            color="default"
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              fontWeight: 600,
              color: getMatchColor(internship.matchPercentage),
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider"
            }}
          />
        )}

        <CardHeader
          avatar={
            <Box
              sx={{
                bgcolor: "primary.main",
                color: "white",
                borderRadius: 2,
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MdBusiness size={24} />
            </Box>
          }
          action={
            <IconButton onClick={handleSave}>
              <MdFavorite
                size={22}
                color={isSaved ? "red" : "gray"}
                style={{ transition: "0.3s" }}
              />
            </IconButton>
          }
          title={
            <Typography variant="h6" fontWeight={600}>
              {internship.company}
            </Typography>
          }
          subheader={
            <Typography variant="body2" color="text.secondary">
              {internship.field}
            </Typography>
          }
        />

        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            {internship.role}
          </Typography>

          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Chip label={internship.category} size="small" />
            <Box display="flex" alignItems="center" gap={0.5}>
              <MdCalendarMonth size={16} color="gray" />
              <Typography variant="body2" color="text.secondary">
                {daysUntilDeadline > 0
                  ? `${daysUntilDeadline} days left`
                  : "Deadline passed"}
              </Typography>
            </Box>
          </Box>
        </CardContent>

        <CardActions>
          <Button fullWidth variant="outlined">
            View Details
          </Button>
        </CardActions>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="info" onClose={handleCloseSnackbar}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      {openDetails && (
        <InternshipDetails
          open={openDetails}
          onClose={() => setOpenDetails(false)}
          internship={internship}
        />
      )}
    </>
  );
};

export default InternshipCard;