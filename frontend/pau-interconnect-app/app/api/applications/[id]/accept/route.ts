import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { createNotification } from "@/lib/notifications";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: applicationId } = await params;

  // Verify the application belongs to this student and is in "offered" stage
  const { data: application } = await supabase
    .from("applied_internships")
    .select("id, user_id, stage, internship_id")
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
    // The database refuses a second active placement with a readable message.
    const conflict = error.message?.includes("active internship placement");
    return NextResponse.json(
      { error: error.message },
      { status: conflict ? 409 : 500 },
    );
  }

  // Record in stage history
  await supabase.from("application_stage_history").insert({
    application_id: applicationId,
    from_stage: "offered",
    to_stage: "accepted",
    changed_by: user.id,
    notes: "Student accepted the offer",
  });

  // Notify employer
  const [{ data: internship }, { data: profile }] = await Promise.all([
    supabase
      .from("internships")
      .select("employer_id, poster_id, role")
      .eq("id", application.internship_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const employerId = internship?.employer_id || internship?.poster_id;
  if (employerId) {
    const studentName = profile?.full_name || "A candidate";
    const roleTitle = internship?.role || "internship";
    await createNotification({
      userId: employerId,
      type: "offer_accepted",
      title: "Offer Accepted",
      body: `${studentName} accepted your offer for ${roleTitle}! Placement is now active.`,
      link: `/dashboard/employer/internships/${application.internship_id}`,
      metadata: {
        application_id: applicationId,
        internship_id: application.internship_id,
      },
    }).catch((err) => {
      console.error("Failed to notify employer of accepted offer:", err);
    });
  }

  return NextResponse.json({ message: "Offer accepted successfully" });
}
