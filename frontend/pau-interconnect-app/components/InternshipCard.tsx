"use client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cx } from "@/utils/cx";
import {
  Heart,
  ArrowUpRight,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { ApplicationProgress } from "@/components/ApplicationProgress";

import { getDaysUntilDeadline } from "@/lib/deadlines";
import { MatchScore } from "@/components/match/MatchScore";

interface InternshipCardProps {
  internship: {
    id: string;
    company: string;
    role: string;
    location: string;
    deadline: string;
    category: string;
    matchPercentage?: number | null;
    imageUrl?: string;
    applicationStatus?: string;
    applicationStage?: string;
    applicationId?: string;
    poster_id?: string;
    employer_id?: string;
  };
}

export default function InternshipCard({ internship }: InternshipCardProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cardStage, setCardStage] = useState(internship.applicationStage);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const { user } = useAuth();

  const checkSavedStatus = useCallback(
    async (mounted: boolean) => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("saved_internships")
        .select("id")
        .eq("user_id", user.id)
        .eq("internship_id", internship.id)
        .maybeSingle();

      if (!error && mounted) setIsSaved(Boolean(data));
    },
    [internship.id, user?.id],
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
      const userId = user?.id;

      if (!userId) {
        toast.error("Please sign in to save internships.");
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

  const daysUntilDeadline = getDaysUntilDeadline(internship.deadline);



  const statusConfig: Record<
    string,
    { label: string; icon: LucideIcon; color: string }
  > = {
    accepted: {
      label: "Accepted",
      icon: CheckCircle,
      color: "text-success-fg bg-success-subtle border-success/20",
    },
    offered: {
      label: "Offered",
      icon: CheckCircle,
      color: "text-success-fg bg-success-subtle border-success/20",
    },
    interview: {
      label: "Interview",
      icon: Loader2,
      color: "text-info-fg bg-info-subtle border-info/20",
    },
    shortlisted: {
      label: "Shortlisted",
      icon: CheckCircle,
      color: "text-brand-secondary bg-brand-secondary-subtle border-brand-secondary/20",
    },
    reviewed: {
      label: "Reviewed",
      icon: Loader2,
      color: "text-brand bg-brand-subtle border-brand/20",
    },
    pending: {
      label: "Pending",
      icon: Loader2,
      color: "text-warning-fg bg-warning-subtle border-warning/20",
    },
    applied: {
      label: "Applied",
      icon: Loader2,
      color: "text-info-fg bg-info-subtle border-info/20",
    },
    rejected: {
      label: "Denied",
      icon: XCircle,
      color: "text-danger-fg bg-danger-subtle border-danger/20",
    },
    withdrawn: {
      label: "Withdrawn",
      icon: XCircle,
      color: "text-fg-muted bg-surface-sunken border-border",
    },
  };

  // Prefer stage over status for display
  const displayStatus =
    cardStage && cardStage !== "applied" && cardStage !== "pending"
      ? cardStage
      : internship.applicationStatus?.toLowerCase() || "";

  const statusData =
    statusConfig[displayStatus] ||
    (displayStatus
      ? {
          label: displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1),
          icon: Loader2,
          color: "text-brand-secondary bg-brand-secondary-subtle border-brand-secondary/20",
        }
      : null);

  const handleAcceptOffer = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!internship.applicationId) return;
    setIsAccepting(true);
    try {
      const res = await fetch(
        `/api/applications/${internship.applicationId}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to accept offer");
      }
      setCardStage("accepted");
      toast.success("Offer accepted! Your placement is now active.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to accept offer");
    } finally {
      setIsAccepting(false);
    }
  };

  const handleWithdraw = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!internship.applicationId || isWithdrawing) return;
    if (
      !window.confirm(
        "Are you sure you want to withdraw this application? This cannot be undone.",
      )
    ) {
      return;
    }
    setIsWithdrawing(true);
    try {
      const res = await fetch(
        `/api/applications/${internship.applicationId}/withdraw`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to withdraw application");
      }
      setCardStage("withdrawn");
      toast.success("Application withdrawn successfully");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to withdraw application",
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="group bg-surface rounded-2xl border border-border hover:border-border-strong transition-all duration-200 hover:shadow-md overflow-hidden flex flex-col h-full text-fg">
      {/* Image */}
      <div className="relative h-[140px] overflow-hidden">
        <Image
          src={
            internship.imageUrl ||
            "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=318"
          }
          alt={`${internship.company}`}
          fill
          unoptimized
          className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

        {/* Save Button */}
        <button
          onClick={handleSave}
          className={cx(
            "absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all backdrop-blur-sm",
            isSaved
              ? "bg-danger text-on-danger shadow-sm"
              : "bg-surface/80 text-fg-muted hover:bg-surface hover:text-danger-fg",
          )}
        >
          <Heart className={cx("w-3.5 h-3.5", isSaved && "fill-current")} />
        </button>

        {/* Match Badge */}
        <div className="absolute top-3 left-3">
          <MatchScore score={internship.matchPercentage} variant="badge" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow p-4">
        <div className="mb-3">
          <Link
            href={`/internships/${internship.id}`}
            className="hover:underline decoration-border underline-offset-2"
          >
            <h3 className="text-sm font-semibold text-fg leading-snug line-clamp-2 group-hover:text-brand transition-colors">
              {internship.role}
            </h3>
          </Link>
          {internship.poster_id || internship.employer_id ? (
            <Link
              href={`/companies/${internship.poster_id || internship.employer_id}`}
              className="text-xs text-fg-muted mt-1 font-medium hover:text-brand hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {internship.company}
            </Link>
          ) : (
            <p className="text-xs text-fg-muted mt-1 font-medium">
              {internship.company}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-fg-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3 text-fg-subtle" />
            {internship.location}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-fg-subtle" />
            {daysUntilDeadline === null
              ? "Open"
              : daysUntilDeadline > 0
                ? `${daysUntilDeadline}d left`
                : daysUntilDeadline === 0
                  ? "Ends today"
                  : "Closed"}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-fg-subtle uppercase tracking-wider">
            {internship.category}
          </span>

          {statusData ? (
            <span
              className={cx(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border",
                statusData.color,
              )}
            >
              <statusData.icon className="w-3 h-3" />
              {statusData.label}
            </span>
          ) : (
            <Link
              href={`/internships/${internship.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-fg text-fg-inverse text-[11px] font-semibold hover:opacity-90 transition-colors"
            >
              Apply
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          )}
        </div>

        {displayStatus && <ApplicationProgress stage={displayStatus} />}

        {cardStage === "offered" && internship.applicationId && (
          <button
            onClick={handleAcceptOffer}
            disabled={isAccepting}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-on-success bg-success hover:opacity-90 disabled:opacity-50 transition-colors"
          >
            {isAccepting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle className="w-3.5 h-3.5" />
            )}
            Accept Offer
          </button>
        )}

        {cardStage &&
          !["accepted", "rejected", "withdrawn"].includes(cardStage) &&
          internship.applicationId && (
            <div className="flex items-center justify-end pt-1">
              <button
                onClick={handleWithdraw}
                disabled={isWithdrawing}
                className="text-[10px] font-medium text-rose-500 hover:text-rose-700 hover:underline flex items-center gap-1 disabled:opacity-50 transition-colors"
              >
                {isWithdrawing && (
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                )}
                Withdraw
              </button>
            </div>
          )}
      </div>
    </div>
  );
}
