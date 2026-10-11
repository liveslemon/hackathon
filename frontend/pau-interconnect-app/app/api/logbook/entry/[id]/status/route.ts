import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

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

  // Verify the user is the employer for this entry
  const { data: entry, error: fetchError } = await supabase
    .from("logbook_entries")
    .select("employer_id")
    .eq("id", entryId)
    .single();

  if (fetchError || !entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  if (entry.employer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  return NextResponse.json({ success: true });
}
