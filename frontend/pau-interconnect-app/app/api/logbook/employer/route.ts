import { NextRequest, NextResponse } from "next/server";
import { maskStudentForEmployer } from "@/lib/privacy";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const employerId = req.nextUrl.searchParams.get("employer_id");

  if (!employerId || employerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("logbook_entries")
    .select("*, profiles!logbook_entries_student_id_fkey(full_name, email, avatar_url, settings)")
    .eq("employer_id", employerId)
    .order("date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entries = (data || []).map((entry) => ({
    ...entry,
    profiles: entry.profiles ? maskStudentForEmployer(entry.profiles) : entry.profiles,
  }));

  return NextResponse.json({ entries });
}
