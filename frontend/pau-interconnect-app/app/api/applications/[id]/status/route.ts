import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { sendEmail, type EmailResult } from "@/lib/email";
import { applicationStatusEmail } from "@/lib/email-templates";
import { logDecision } from "@/lib/audit";
import { applicationStatusUpdateSchema } from "@/lib/validations/employer";

export async function PUT(
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

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = applicationStatusUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { status, decision_notes } = parsed.data;

  const { data: application } = await supabase
    .from("applied_internships")
    .select("id, status, stage, user_id, internship_id, internships(employer_id, poster_id, role, company)")
    .eq("id", id)
    .single();

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const internship = Array.isArray(application.internships)
    ? application.internships[0]
    : application.internships;

  const isOwner =
    internship?.employer_id === user.id || internship?.poster_id === user.id;

  if (!isOwner) {
    return NextResponse.json({ error: "Forbidden: Not the internship employer" }, { status: 403 });
  }

  // Prevent double processing / duplicate emails
  if (application.status === status) {
    return NextResponse.json({
      success: true,
      status,
      email: { status: "skipped", reason: "status unchanged" },
    });
  }

  // Cannot undo terminal states once decided
  if (application.status === "accepted" || application.status === "rejected") {
    return NextResponse.json(
      { error: `Cannot change status once an application has been ${application.status}` },
      { status: 400 },
    );
  }

  const targetStage =
    status === "accepted"
      ? "accepted"
      : status === "rejected"
        ? "rejected"
        : "applied";

  const updatePayload: Record<string, unknown> = {
    status,
    stage: targetStage,
    decided_at: new Date().toISOString(),
    decided_by: user.id,
  };

  if (decision_notes) {
    updatePayload.decision_notes = decision_notes;
  }

  const { error } = await supabase
    .from("applied_internships")
    .update(updatePayload)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  await logDecision({
    actorId: user.id,
    action: status === "accepted" ? "application_accepted" : "application_rejected",
    targetType: "application",
    targetId: id,
    details: {
      from_status: application.status,
      to_status: status,
      from_stage: application.stage,
      to_stage: targetStage,
      reason: decision_notes || null,
      internship_id: application.internship_id,
      student_id: application.user_id,
    },
  });

  // Also record in stage history
  await supabase.from("application_stage_history").insert({
    application_id: id,
    from_stage: application.stage || "applied",
    to_stage: targetStage,
    changed_by: user.id,
    notes: decision_notes || null,
  });

  // Send email
  let email: EmailResult | { status: "skipped"; reason: string } = {
    status: "skipped",
    reason: "not attempted",
  };

  try {
    const { data: student } = await supabase
      .from("profiles")
      .select("email, full_name, notification_preferences, settings")
      .eq("id", application.user_id)
      .single();

    const legacyPrefs = student?.notification_preferences as
      | { email_status_updates?: boolean }
      | null;
    const settingsPrefs = (
      student?.settings as { notifications?: { application_updates?: boolean } } | null
    )?.notifications;
    const wantsEmail =
      settingsPrefs?.application_updates !== false &&
      legacyPrefs?.email_status_updates !== false;

    if (!student?.email) {
      email = { status: "skipped", reason: "student has no email address" };
    } else if (!wantsEmail) {
      email = { status: "skipped", reason: "student turned off application emails" };
    } else {
      const emailData = applicationStatusEmail({
        studentName: student.full_name || "Student",
        role: internship?.role || "Internship",
        company: internship?.company || "Company",
        status: targetStage,
        feedback: decision_notes || undefined,
      });
      email = await sendEmail({ to: student.email, ...emailData });
    }
  } catch (err) {
    console.error("Failed to send status update email:", err);
    email = { status: "skipped", reason: "error preparing email" };
  }

  return NextResponse.json({ success: true, status, email });
}
