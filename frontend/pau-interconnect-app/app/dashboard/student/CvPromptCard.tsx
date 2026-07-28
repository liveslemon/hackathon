"use client";
import { useEffect, useState } from "react";
import { Typography } from "@/components/ui";
import { Button } from "@/components/ui";
import { FileText, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function CvPromptCard() {
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkCv() {
      try {
        const { supabase } = await import("@/lib/supabaseClient");
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const user = session?.user;
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
  }, []);

  // Don't render while loading or if user already has a CV
  if (show === null || show === false) return null;

  return (
    <div className="rounded-3xl border border-dashed border-violet-200 bg-violet-50/50 p-5 mb-8 flex items-center gap-4">
      <div className="w-10 h-10 rounded-2xl bg-violet-100 flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5 text-violet-600" />
      </div>
      <div className="flex-1 min-w-0">
        <Typography variant="body2" weight="bold" className="text-slate-800">
          Upload your CV for better matches
        </Typography>
        <Typography variant="caption" className="text-slate-500">
          Get personalized internship matching, ATS scoring, and career insights
        </Typography>
      </div>
      <Link href="/dashboard/student/cv">
        <Button size="sm" className="shrink-0 gap-1.5">
          Upload CV
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </Link>
    </div>
  );
}
