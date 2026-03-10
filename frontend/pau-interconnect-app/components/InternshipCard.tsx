"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Link,
  Chip,
  CircularProgress,
  CardMedia,
  CardActions,
  Divider,
  Box,
} from "@mui/material";
import Favorite from "@mui/icons-material/Favorite";
import FavoriteBorder from "@mui/icons-material/FavoriteBorder";
import { supabase } from "@/lib/supabaseClient";

interface InternshipCardProps {
  internship: {
    id: string;
    company: string;
    role: string;
    location: string;
    deadline: string;
    category: string;
    matchPercentage?: number;
    imageUrl?: string;
  };
}

export default function InternshipCard({ internship }: InternshipCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkSavedStatus = useCallback(
    async (mounted: boolean) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("saved_internships")
        .select("id")
        .eq("user_id", user.id)
        .eq("internship_id", internship.id)
        .maybeSingle();

      if (!error && mounted) setIsSaved(Boolean(data));
    },
    [internship.id],
  );

  useEffect(() => {
    let mounted = true;
    checkSavedStatus(mounted);

    const handleUpdate = () => checkSavedStatus(mounted);
    window.addEventListener("savedInternshipsUpdate", handleUpdate);

    return () => {
      mounted = false;
      window.removeEventListener("savedInternshipsUpdate", handleUpdate);
    };
  }, [checkSavedStatus]);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) {
        alert("Please sign in to save internships.");
        setIsLoading(false);
        return;
      }

      if (isSaved) {
        await supabase
          .from("saved_internships")
          .delete()
          .eq("user_id", userId)
          .eq("internship_id", internship.id);
        setIsSaved(false);
      } else {
        await supabase
          .from("saved_internships")
          .insert([{ user_id: userId, internship_id: internship.id }]);
        setIsSaved(true);
      }
      window.dispatchEvent(new CustomEvent("savedInternshipsUpdate"));
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const daysUntilDeadline = internship.deadline
    ? Math.ceil(
        (new Date(internship.deadline).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  const getMatchColor = (percentage?: number) => {
    if (!percentage) return "default";
    if (percentage >= 80) return "success";
    if (percentage >= 60) return "primary";
    if (percentage >= 40) return "warning";
    return "default";
  };

  return (
    <Card
      variant="outlined"
      sx={{
        width: 320,
        transition: "transform 0.2s",
        "&:hover": { transform: "translateY(-4px)", boxShadow: 3 },
      }}
    >
      <Box sx={{ position: "relative" }}>
        <CardMedia
          component="img"
          height="160"
          image={
            internship.imageUrl ||
            "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=318"
          }
          alt={`${internship.company} office`}
        />
        {internship.matchPercentage !== undefined && (
          <Chip
            size="small"
            color={getMatchColor(internship.matchPercentage)}
            label={`${internship.matchPercentage}% Match`}
            sx={{
              position: "absolute",
              zIndex: 2,
              top: "0.75rem",
              right: "0.75rem",
              fontWeight: "bold",
              boxShadow: 1,
            }}
          />
        )}
      </Box>
      <CardContent>
        <Typography variant="h6" component="div">
          <Link
            href={`/internships/${internship.id}`}
            underline="none"
            color="inherit"
          >
            {internship.role}
          </Link>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {internship.company} • {internship.location}
        </Typography>
      </CardContent>
      <Divider />
      <CardActions sx={{ justifyContent: "space-between", p: 2 }}>
        <Typography variant="body2" fontWeight="medium">
          {internship.category}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {daysUntilDeadline > 0
            ? `${daysUntilDeadline} days left`
            : "Deadline passed"}
        </Typography>
        <IconButton
          aria-label={isSaved ? "Remove from saved" : "Save internship"}
          size="medium"
          color="error"
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <CircularProgress size={24} color="inherit" />
          ) : isSaved ? (
            <Favorite />
          ) : (
            <FavoriteBorder />
          )}
        </IconButton>
      </CardActions>
    </Card>
  );
}
