import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { sendEmail, type EmailResult } from "@/lib/email";
import { applicationStatusEmail } from "@/lib/email-templates";
import { logDecision } from "@/lib/audit";
import { applicationStageUpdateSchema } from "@/lib/validations/employer";

const VALID_TRANSITIONS: Record<string, string[]> = {
  applied: ["reviewed", "shortlisted", "interview", "offered", "rejected"],
  reviewed: ["applied", "shortlisted", "interview", "offered", "rejected"],
  shortlisted: ["applied", "interview", "offered", "rejected"],
  interview: ["applied", "offered", "accepted", "rejected"],
  offered: ["applied", "accepted", "rejected"],
  accepted: [],
  rejected: [],
  withdrawn: [],
};

export async function PATCH(
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

  const parsed = applicationStageUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { stage, notes } = parsed.data;

  const { data: application } = await supabase
    .from("applied_internships")
    .select(
      "id, stage, status, user_id, internship_id, internships(employer_id, poster_id, role, company)",
    )
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

  const currentStage = application.stage || "applied";

  // Prevent double emails and redundant operations if stage has not changed
  if (currentStage === stage) {
    return NextResponse.json({
      success: true,
      stage,
      email: { status: "skipped", reason: "stage unchanged" },
    });
  }

  const allowedTransitions = VALID_TRANSITIONS[currentStage] || [];
  if (!allowedTransitions.includes(stage)) {
    return NextResponse.json(
      { error: `Cannot transition from '${currentStage}' to '${stage}'` },
      { status: 400 },
    );
  }

  const nextStatus =
    stage === "accepted"
      ? "accepted"
      : stage === "rejected"
        ? "rejected"
        : "pending";

  const isDecided = stage === "accepted" || stage === "rejected" || stage === "offered";

  const updatePayload: Record<string, unknown> = {
    stage,
    status: nextStatus,
  };

  if (notes) {
    updatePayload.decision_notes = notes;
  }

  if (isDecided) {
    updatePayload.decided_at = new Date().toISOString();
    updatePayload.decided_by = user.id;
  }

  const { error: updateError } = await supabase
    .from("applied_internships")
    .update(updatePayload)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Record stage history
  await supabase.from("application_stage_history").insert({
    application_id: id,
    from_stage: currentStage,
    to_stage: stage,
    changed_by: user.id,
    notes: notes || null,
  });

  // Record decision audit trail
  const auditAction =
    stage === "rejected"
      ? "application_rejected"
      : stage === "offered"
        ? "application_offered"
        : stage === "accepted"
          ? "application_accepted"
          : "stage_changed";

  await logDecision({
    actorId: user.id,
    action: auditAction,
    targetType: "application",
    targetId: id,
    details: {
      from_stage: currentStage,
      to_stage: stage,
      notes: notes || null,
      internship_id: application.internship_id,
      student_id: application.user_id,
    },
  });

  // Try to send email. The result is returned so the employer UI shows whether the student was emailed.
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
        status: stage,
        feedback: notes || undefined,
      });
      email = await sendEmail({ to: student.email, ...emailData });
    }
  } catch (err) {
    console.error("Failed to send stage change email:", err);
    email = { status: "skipped", reason: "error preparing email" };
  }

  return NextResponse.json({ success: true, stage, email });
}
