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

  // Verify the application belongs to this student and is not in terminal stage
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

  const terminalStages = ["accepted", "rejected", "withdrawn"];
  if (terminalStages.includes(application.stage)) {
    return NextResponse.json(
      { error: `Cannot withdraw an application that is already ${application.stage}` },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("applied_internships")
    .update({ stage: "withdrawn", status: "withdrawn" })
    .eq("id", applicationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Record in stage history
  await supabase.from("application_stage_history").insert({
    application_id: applicationId,
    from_stage: application.stage,
    to_stage: "withdrawn",
    changed_by: user.id,
    notes: "Student withdrew application",
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
      type: "application_withdrawn",
      title: "Application Withdrawn",
      body: `${studentName} withdrew their application for ${roleTitle}.`,
      link: `/dashboard/employer/internships/${application.internship_id}`,
      metadata: {
        application_id: applicationId,
        internship_id: application.internship_id,
      },
    }).catch((err) => {
      console.error("Failed to notify employer of withdrawal:", err);
    });
  }

  return NextResponse.json({ message: "Application withdrawn successfully" });
}
