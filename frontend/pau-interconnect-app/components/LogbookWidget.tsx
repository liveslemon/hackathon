import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseFetch } from "@/lib/supabase-fetch";
import { todayInLagos } from "@/lib/logbook-dates";
import LogbookWidgetClient from "./LogbookWidgetClient";

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
    // 1. Check if student has an active internship placement
    const { data: applied } = await supabase
      .from("applied_internships")
      .select("status, placement_status")
      .eq("user_id", userId)
      .or("placement_status.eq.active,status.eq.accepted")
      .limit(1)
      .maybeSingle();

    if (applied) {
      hasStarted = true;
      // 2. Check today's logbook entry in Lagos timezone
      const todayStr = todayInLagos();
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
    <LogbookWidgetClient isMissing={isMissing} todayStatus={todayStatus} />
  );
}
