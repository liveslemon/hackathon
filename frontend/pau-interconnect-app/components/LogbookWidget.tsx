import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Card, Typography, Button, Stack } from "@/components/ui";
import { BookOpen, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { supabaseFetch } from "@/lib/supabase-fetch";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: supabaseFetch },
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {}
      },
    }
  );
}

export default async function LogbookWidget({ userId }: { userId: string }) {
  const supabase = await getSupabase();
  let hasStarted = false;
  let todayStatus: string | null = null;

  try {
    // 1. Check if student has an accepted internship
    const { data: applied } = await supabase
      .from("applied_internships")
      .select("status")
      .eq("user_id", userId)
      .eq("status", "accepted")
      .limit(1)
      .maybeSingle();

    if (applied) {
      hasStarted = true;
      // 2. Check today's logbook entry
      const todayStr = new Date().toISOString().split("T")[0];
      const { data: entry } = await supabase
        .from("logbook_entries")
        .select("status")
        .eq("student_id", userId)
        .eq("date", todayStr)
        .maybeSingle();

      if (entry) {
        todayStatus = entry.status; // 'pending', 'approved', 'flagged'
      } else {
        todayStatus = "missing";
      }
    }
  } catch (err) {
    console.error("Logbook widget server-side error:", err);
  }

  if (!hasStarted) return null;

  const isMissing = todayStatus === "missing";

  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border ${
      isMissing 
        ? "bg-amber-50/60 border-amber-100" 
        : "bg-emerald-50/60 border-emerald-100"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          isMissing ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
        }`}>
          {isMissing ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700">
            {isMissing ? "Today's log is missing" : "Today's log submitted"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {isMissing 
              ? "Fill in your SIWES logbook before end of day" 
              : `Status: ${todayStatus}`}
          </p>
        </div>
      </div>
      <Link href="/dashboard/student/logbook" className="no-underline shrink-0">
        <button className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
          isMissing 
            ? "bg-amber-600 text-white hover:bg-amber-700 shadow-sm" 
            : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
        }`}>
          <BookOpen className="w-3.5 h-3.5" />
          Open Logbook
        </button>
      </Link>
    </div>
  );
}
