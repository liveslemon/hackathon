"use client";
import { useState, useEffect, useCallback } from "react";
import { cx } from "@/utils/cx";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Badge,
  Stack,
} from "@/components/ui";
import { FiHeart } from "react-icons/fi";
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
    applicationStatus?: string;
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
    if (percentage === undefined || percentage === null) return "primary";
    if (percentage >= 70) return "success";
    if (percentage >= 40) return "warning";
    return "error";
  };

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'accepted': return 'success';
      case 'rejected': return 'error';
      default: return 'primary';
    }
  };

  return (
    <Card className="h-full group hover:shadow-xl transition-all duration-300 border-slate-100 flex flex-col overflow-hidden rounded-2xl md:rounded-3xl hover:-translate-y-0.5 md:hover:-translate-y-1">
      <div className="relative h-36 md:h-48 overflow-hidden">
        <img
          src={
            internship.imageUrl ||
            "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=318"
          }
          alt={`${internship.company} office`}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <Stack className="absolute top-4 left-4 right-4" direction="row" justify="between">
          {internship.applicationStatus && (
            <Badge 
              variant={getStatusColor(internship.applicationStatus)}
              className={cx(
                "text-[10px] px-3 py-1.5 backdrop-blur-md shadow-xl border-white/40 bg-white/80",
                internship.applicationStatus.toLowerCase() === 'accepted' ? "text-emerald-700" :
                internship.applicationStatus.toLowerCase() === 'rejected' ? "text-rose-700" : "text-indigo-700"
              )}
            >
              {internship.applicationStatus.toUpperCase()}
            </Badge>
          )}
          {internship.matchPercentage !== undefined && (
            <Badge 
              variant={getMatchColor(internship.matchPercentage)}
              className={cx(
                "text-[10px] px-3 py-1.5 backdrop-blur-md shadow-xl border-white/40 ml-auto bg-white/80",
                internship.matchPercentage >= 70 ? "text-emerald-700" :
                internship.matchPercentage >= 40 ? "text-amber-700" : "text-rose-700"
              )}
            >
              {internship.matchPercentage}% MATCH
            </Badge>
          )}
        </Stack>
      </div>

      <CardContent className="flex-grow p-4 md:p-6">
        <Stack spacing={2}>
          <Typography variant="h5" className="group-hover:text-brand transition-colors line-clamp-1">
            <a href={`/internships/${internship.id}`} className="hover:underline">
              {internship.role}
            </a>
          </Typography>
          <Typography variant="body2" color="muted" className="mb-4">
            {internship.company} • {internship.location}
          </Typography>
          
          <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
            <Typography variant="caption" weight="bold" className="text-slate-400">
              {internship.category.toUpperCase()}
            </Typography>
            <Typography variant="caption" color={daysUntilDeadline > 3 ? "muted" : "error"}>
              {daysUntilDeadline > 0
                ? `${daysUntilDeadline} days left`
                : "Deadline passed"}
            </Typography>
          </div>
        </Stack>
      </CardContent>

      <div className="px-4 py-3 md:px-6 md:py-4 bg-slate-50/50 flex justify-between items-center border-t border-slate-100">
        <Button
          variant="ghost"
          size="sm"
          colorType={isSaved ? "danger" : "primary"}
          isLoading={isLoading}
          onClick={handleSave}
          className="rounded-xl w-10 h-10 p-0"
        >
          {isSaved ? <FiHeart className="fill-current w-5 h-5" /> : <FiHeart className="w-5 h-5" />}
        </Button>
        {internship.applicationStatus ? (
          <Button
            variant="solid"
            size="sm"
            disabled={true}
            colorType={
              internship.applicationStatus.toLowerCase() === 'accepted' ? 'secondary' : 
              internship.applicationStatus.toLowerCase() === 'rejected' ? 'danger' : 'primary'
            }
            className={cx(
              "px-5 text-xs opacity-80 cursor-not-allowed",
              internship.applicationStatus.toLowerCase() === 'accepted' ? "bg-emerald-500 hover:bg-emerald-500 border-none" : ""
            )}
          >
            {internship.applicationStatus.toLowerCase() === 'accepted' ? 'Approved' : 
             internship.applicationStatus.toLowerCase() === 'rejected' ? 'Denied' : 'Pending'}
          </Button>
        ) : (
          <a href={`/internships/${internship.id}`}>
            <Button variant="solid" size="sm" className="px-5 text-xs">
              Apply Now
            </Button>
          </a>
        )}
      </div>
    </Card>
  );
}
