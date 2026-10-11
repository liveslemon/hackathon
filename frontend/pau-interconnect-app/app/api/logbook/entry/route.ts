import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { canEditEntry, isIsoDate, todayInLagos } from "@/lib/logbook-dates";

export async function POST(req: Request) {
  const [supabase, body] = await Promise.all([getSupabaseServer(), req.json()]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { student_id, employer_id, activities_raw, activities_enhanced, date: requestedDate } = body;

  if (!student_id || !employer_id || !activities_raw) {
    return NextResponse.json(
      { error: "student_id, employer_id, and activities_raw are required" },
      { status: 400 },
    );
  }

  if (student_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = todayInLagos();
  const date = requestedDate ?? today;
  if (!isIsoDate(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("logbook_entries")
    .select("date, status")
    .eq("student_id", student_id)
    .eq("date", date)
    .maybeSingle();

  if (!canEditEntry(existing, date, today)) {
    return NextResponse.json(
      {
        error:
          existing?.status === "approved"
            ? "This entry has been approved by your supervisor and can't be changed."
            : "You can only log or edit entries from the last 7 days.",
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("logbook_entries")
    .upsert(
      {
        student_id,
        employer_id,
        date,
        activities_raw,
        activities_enhanced: activities_enhanced || null,
        status: "pending",
      },
      { onConflict: "student_id,date" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data });
}
