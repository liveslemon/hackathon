"use client";
import { useState, useEffect, useCallback } from "react";
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
    poster_id?: string;
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

  const matchPct = internship.matchPercentage ?? 0;
  const matchColor =
    matchPct >= 70
      ? "text-emerald-600 bg-emerald-50"
      : matchPct >= 40
        ? "text-amber-600 bg-amber-50"
        : "text-slate-500 bg-slate-50";

  const statusConfig: Record<
    string,
    { label: string; icon: LucideIcon; color: string }
  > = {
    accepted: {
      label: "Approved",
      icon: CheckCircle,
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    },
    rejected: {
      label: "Denied",
      icon: XCircle,
      color: "text-red-500 bg-red-50 border-red-100",
    },
    pending: {
      label: "Pending",
      icon: Loader2,
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
    applied: {
      label: "Applied",
      icon: Loader2,
      color: "text-blue-600 bg-blue-50 border-blue-100",
    },
  };

  const appStatus = internship.applicationStatus?.toLowerCase() || "";
  const statusData = statusConfig[appStatus];

  return (
    <div className="group bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-all duration-200 hover:shadow-md overflow-hidden flex flex-col h-full">
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
              ? "bg-red-500 text-white shadow-sm"
              : "bg-white/80 text-slate-500 hover:bg-white hover:text-red-500",
          )}
        >
          <Heart className={cx("w-3.5 h-3.5", isSaved && "fill-current")} />
        </button>

        {/* Match Badge */}
        {matchPct > 0 && (
          <div
            className={cx(
              "absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-bold",
              matchColor,
            )}
          >
            {matchPct}% match
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-grow p-4">
        <div className="mb-3">
          <Link
            href={`/internships/${internship.id}`}
            className="hover:underline decoration-slate-300 underline-offset-2"
          >
            <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
              {internship.role}
            </h3>
          </Link>
          {internship.poster_id ? (
            <Link
              href={`/companies/${internship.poster_id}`}
              className="text-xs text-slate-400 mt-1 font-medium hover:text-indigo-600 hover:underline"
            >
              {internship.company}
            </Link>
          ) : (
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {internship.company}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {internship.location}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {daysUntilDeadline > 0 ? `${daysUntilDeadline}d left` : "Closed"}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-50 flex items-center justify-between">
        <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
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
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[11px] font-semibold hover:bg-slate-700 transition-colors"
          >
            Apply
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
