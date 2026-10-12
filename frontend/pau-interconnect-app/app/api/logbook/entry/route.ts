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

  // employer_id is ignored: the database derives the supervisor from the
  // student's placement (application_id), so it can't be spoofed.
  const { student_id, application_id, activities_raw, activities_enhanced, date: requestedDate } = body;

  if (!student_id || !activities_raw) {
    return NextResponse.json(
      { error: "student_id and activities_raw are required" },
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

  if (date > today) {
    return NextResponse.json(
      { error: "Cannot create logbook entries for future dates." },
      { status: 400 },
    );
  }

  // 1. Resolve and validate the student's placement
  let targetApplicationId = application_id;
  if (!targetApplicationId) {
    const { data: activePlacement } = await supabase
      .from("applied_internships")
      .select("id")
      .eq("user_id", student_id)
      .eq("placement_status", "active")
      .maybeSingle();
    targetApplicationId = activePlacement?.id ?? null;
  }

  if (!targetApplicationId) {
    return NextResponse.json(
      { error: "You need an active internship placement to record logbook entries." },
      { status: 400 },
    );
  }

  const { data: placement } = await supabase
    .from("applied_internships")
    .select("id, user_id, placement_status, internship:internships(employer_id, poster_id)")
    .eq("id", targetApplicationId)
    .maybeSingle();

  if (!placement || placement.user_id !== student_id) {
    return NextResponse.json(
      { error: "Invalid internship placement." },
      { status: 400 },
    );
  }

  const { data: existing } = await supabase
    .from("logbook_entries")
    .select("date, status, feedback_notes")
    .eq("student_id", student_id)
    .eq("date", date)
    .maybeSingle();

  if (placement.placement_status !== "active" && existing?.status !== "flagged") {
    return NextResponse.json(
      { error: "This internship placement has ended; its logbook is read-only." },
      { status: 400 },
    );
  }

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

  const internship = Array.isArray(placement.internship)
    ? placement.internship[0]
    : placement.internship;
  const employerId = internship?.employer_id ?? internship?.poster_id ?? null;

  const { data, error } = await supabase
    .from("logbook_entries")
    .upsert(
      {
        student_id,
        application_id: targetApplicationId,
        employer_id: employerId,
        date,
        activities_raw,
        activities_enhanced: activities_enhanced || null,
        status: "pending",
        feedback_notes: existing?.status === "flagged" ? existing.feedback_notes : null,
      },
      { onConflict: "student_id,date" },
    )
    .select()
    .single();

  if (error) {
    // 42501 = rule enforced in the database (no active placement, ended
    // placement, approved entry): show the student the reason.
    const status = error.code === "42501" ? 400 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ entry: data });
}

