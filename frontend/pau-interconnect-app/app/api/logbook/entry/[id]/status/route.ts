import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { createNotification } from "@/lib/notifications";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [supabase, body, { id: entryId }] = await Promise.all([
    getSupabaseServer(),
    req.json(),
    params,
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { status, feedback_notes } = body;

  if (!status || !["approved", "flagged", "pending"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid status. Must be one of: approved, flagged, pending" },
      { status: 400 },
    );
  }

  // Verify the user is the assigned supervisor for this entry and prevent self-approval
  const { data: entry, error: fetchError } = await supabase
    .from("logbook_entries")
    .select("id, employer_id, student_id, date")
    .eq("id", entryId)
    .single();

  if (fetchError || !entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  if (entry.student_id === user.id) {
    return NextResponse.json(
      { error: "Forbidden: Students cannot review or approve their own entries." },
      { status: 403 },
    );
  }

  if (entry.employer_id !== user.id) {
    return NextResponse.json(
      { error: "Forbidden: Not authorized to review this entry." },
      { status: 403 },
    );
  }

  const updateData: Record<string, unknown> = {
    status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: user.id,
  };

  if (feedback_notes !== undefined) {
    updateData.feedback_notes = feedback_notes;
  }

  const { error } = await supabase
    .from("logbook_entries")
    .update(updateData)
    .eq("id", entryId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify student on review decision (Requirement 4)
  try {
    if (status === "approved" || status === "flagged") {
      await createNotification({
        userId: entry.student_id,
        type: status === "approved" ? "logbook_approved" : "logbook_flagged",
        title: status === "approved" ? "Logbook Entry Approved" : "Revision Requested on Logbook Entry",
        body: status === "approved"
          ? `Your logbook entry for ${entry.date} was approved by your supervisor.`
          : `Your logbook entry for ${entry.date} requires revisions: ${feedback_notes || "Please check supervisor feedback notes."}`,
        link: "/dashboard/student/logbook",
        metadata: { entry_id: entryId, date: entry.date, status },
      });
    }
  } catch (notifyErr) {
    console.error("Failed to notify student of logbook review:", notifyErr);
  }

  return NextResponse.json({ success: true });
}

