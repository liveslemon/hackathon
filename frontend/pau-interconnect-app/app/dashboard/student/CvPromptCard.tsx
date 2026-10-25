"use client";
import { useEffect, useState } from "react";
import { Typography, Button } from "@/components/ui";
import { FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export default function CvPromptCard() {
  const [show, setShow] = useState<boolean | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    async function checkCv() {
      try {
        if (!user) {
          setShow(true);
          return;
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("cv_text, cv_structured, cv_url, cv_processing_status")
          .eq("id", user.id)
          .maybeSingle();
        setShow(
          !(
            profile?.cv_text ||
            profile?.cv_structured ||
            profile?.cv_url ||
            profile?.cv_processing_status === "complete"
          ),
        );
      } catch {
        setShow(true);
      }
    }
    checkCv();
  }, [user]);

  // Don't render while loading or if user already has a CV
  if (show === null || show === false) return null;

  return (
    <div className="rounded-2xl border border-dashed border-brand/30 bg-brand-subtle/40 p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <Typography variant="body2" weight="bold" className="text-fg leading-snug">
            Upload your CV for automated match scoring
          </Typography>
          <Typography variant="caption" className="text-fg-muted mt-0.5 block">
            Unlock real-time match compatibility, ATS diagnostics, and skill recommendations.
          </Typography>
        </div>
      </div>
      <Link href="/dashboard/student/cv" className="shrink-0 w-full sm:w-auto">
        <Button size="sm" colorType="primary" className="w-full sm:w-auto gap-1.5">
          <span>Upload CV</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </Link>
    </div>
  );
}
