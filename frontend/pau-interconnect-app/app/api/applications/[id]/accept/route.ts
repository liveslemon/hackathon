import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request, { params }: any) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applicationId = (await params).id;

  // Verify the application belongs to this student and is in "offered" stage
  const { data: application } = await supabase
    .from("applied_internships")
    .select("id, user_id, stage")
    .eq("id", applicationId)
    .single();

  if (!application) {
    return NextResponse.json(
      { error: "Application not found" },
      { status: 404 },
    );
  }

  if (application.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (application.stage !== "offered") {
    return NextResponse.json(
      { error: "You can only accept an offer that is in the 'offered' stage" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("applied_internships")
    .update({ stage: "accepted", status: "accepted" })
    .eq("id", applicationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Record in stage history
  await supabase.from("application_stage_history").insert({
    application_id: applicationId,
    from_stage: "offered",
    to_stage: "accepted",
    changed_by: user.id,
    notes: "Student accepted the offer",
  });

  return NextResponse.json({ message: "Offer accepted successfully" });
}
