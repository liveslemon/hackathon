import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email";
import { applicationStatusEmail } from "@/lib/email-templates";

const VALID_TRANSITIONS: Record<string, string[]> = {
  applied: ["reviewed", "shortlisted", "interview", "offered", "rejected"],
  reviewed: ["applied", "shortlisted", "interview", "offered", "rejected"],
  shortlisted: ["applied", "interview", "offered", "rejected"],
  interview: ["applied", "offered", "rejected"],
  offered: ["applied", "rejected"],
  accepted: ["applied"],
  rejected: ["applied"],
  withdrawn: ["applied"],
};

export async function PATCH(req: Request, { params }: any) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { stage, notes } = await req.json();

  const { data: application } = await supabase
    .from("applied_internships")
    .select(
      "stage, user_id, internship_id, internships(employer_id, role, company)",
    )
    .eq("id", (await params).id)
    .single();

  if (!application)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if ((application.internships as any)?.employer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const currentStage = application.stage || "applied";
  if (!VALID_TRANSITIONS[currentStage]?.includes(stage)) {
    return NextResponse.json(
      { error: `Cannot move from '${currentStage}' to '${stage}'` },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("applied_internships")
    .update({
      stage,
      status:
        stage === "accepted"
          ? "accepted"
          : stage === "rejected"
            ? "rejected"
            : "pending",
    })
    .eq("id", (await params).id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("application_stage_history").insert({
    application_id: (await params).id,
    from_stage: currentStage,
    to_stage: stage,
    changed_by: user.id,
    notes: notes || null,
  });

  // Try to send email
  try {
    const { data: student } = await supabase
      .from("profiles")
      .select("email, full_name, notification_preferences")
      .eq("id", application.user_id)
      .single();

    const prefs = student?.notification_preferences as any;
    if ((!prefs || prefs.email_status_updates !== false) && student?.email) {
      const emailData = applicationStatusEmail({
        studentName: student.full_name || "Student",
        role: (application.internships as any)?.role || "Internship",
        company: (application.internships as any)?.company || "Company",
        status: stage,
        feedback: notes,
      });
      await sendEmail({ to: student.email, ...emailData });
    }
  } catch (err) {
    console.error("Failed to send stage change email:", err);
  }

  return NextResponse.json({ success: true, stage });
}
