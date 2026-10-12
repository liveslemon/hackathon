import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { createNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  const [supabase, body] = await Promise.all([getSupabaseServer(), req.json()]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { entry_ids, status, feedback_notes } = body;

  if (!Array.isArray(entry_ids) || entry_ids.length === 0) {
    return NextResponse.json(
      { error: "entry_ids must be a non-empty array of IDs." },
      { status: 400 },
    );
  }

  if (!status || !["approved", "flagged", "pending"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid status. Must be one of: approved, flagged, pending" },
      { status: 400 },
    );
  }

  // Fetch all requested entries and verify that all belong to this employer and none are self-reviews
  const { data: entries, error: fetchError } = await supabase
    .from("logbook_entries")
    .select("id, employer_id, student_id, date")
    .in("id", entry_ids);

  if (fetchError || !entries || entries.length === 0) {
    return NextResponse.json(
      { error: "No matching entries found." },
      { status: 404 },
    );
  }

  // Ensure ALL entries belong to the calling employer and prevent self-approval
  for (const entry of entries) {
    if (entry.student_id === user.id) {
      return NextResponse.json(
        { error: "Forbidden: Students cannot review or approve their own entries." },
        { status: 403 },
      );
    }
    if (entry.employer_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You are not the supervisor for one or more of these entries." },
        { status: 403 },
      );
    }
  }

  const updateData: Record<string, unknown> = {
    status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
  };

  if (feedback_notes !== undefined) {
    updateData.feedback_notes = feedback_notes;
  }

  const { error: updateError } = await supabase
    .from("logbook_entries")
    .update(updateData)
    .in("id", entries.map((e) => e.id));

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Notify each affected student
  for (const entry of entries) {
    try {
      await createNotification({
        userId: entry.student_id,
        type: status === "approved" ? "logbook_approved" : "logbook_flagged",
        title: status === "approved" ? "Logbook Entry Approved" : "Revision Requested on Logbook Entry",
        body: status === "approved"
          ? `Your logbook entry for ${entry.date} was approved by your supervisor.`
          : `Your logbook entry for ${entry.date} requires revisions: ${feedback_notes || "Please check supervisor feedback notes."}`,
        link: "/dashboard/student/logbook",
        metadata: { entry_id: entry.id, date: entry.date, status },
      });
    } catch (e) {
      console.error(`Failed to notify student ${entry.student_id}:`, e);
    }
  }

  return NextResponse.json({
    success: true,
    updated_count: entries.length,
  });
}
