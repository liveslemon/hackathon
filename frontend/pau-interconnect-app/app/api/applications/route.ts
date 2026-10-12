import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { isOpenInternship } from "@/lib/internship-columns";
import { sendEmail } from "@/lib/email";
import { applicationReceivedEmail } from "@/lib/email-templates";
import { getAppUrl } from "@/lib/env";

export async function POST(req: Request) {
  const [supabase, body] = await Promise.all([getSupabaseServer(), req.json()]);

  const { internship_id, cover_letter } = body;

  if (!internship_id) {
    return NextResponse.json(
      { error: "internship_id is required" },
      { status: 400 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parallel fetch: internship, match score, profile, and student CV
  const [
    { data: internship },
    { data: match },
    { data: profile },
    { data: cvData },
  ] = await Promise.all([
    supabase
      .from("internships")
      .select("id, role, company, status, deadline, employer_id, poster_id")
      .eq("id", internship_id)
      .maybeSingle(),
    supabase
      .from("match_results")
      .select("match_score")
      .eq("user_id", user.id)
      .eq("internship_id", internship_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name, resume_url, cv_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("student_cvs")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!internship) {
    return NextResponse.json(
      { error: "Internship not found" },
      { status: 404 },
    );
  }

  if (!isOpenInternship(internship)) {
    return NextResponse.json(
      { error: "This internship is no longer accepting applications" },
      { status: 410 },
    );
  }

  const hasCv = Boolean(cvData?.id || profile?.resume_url || profile?.cv_url);
  if (!hasCv) {
    return NextResponse.json(
      { error: "Please upload your CV before applying." },
      { status: 400 },
    );
  }

  const isProfileComplete = Boolean(profile?.full_name?.trim());
  if (!isProfileComplete) {
    return NextResponse.json(
      { error: "Please complete your profile before applying." },
      { status: 400 },
    );
  }

  // Insert directly — the UNIQUE(user_id, internship_id) constraint
  // handles duplicate prevention without race conditions.
  const { data: newApp, error } = await supabase
    .from("applied_internships")
    .insert({
      user_id: user.id,
      internship_id,
      cover_letter: cover_letter || null,
      stage: "applied",
      status: "applied",
      match_score: match?.match_score ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You have already applied to this internship" },
        { status: 409 },
      );
    }
    if (error.code === "23503") {
      return NextResponse.json(
        { error: "Internship not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire email to employer exactly once on successful insert (fail-open)
  const employerId = internship.employer_id || internship.poster_id;
  if (employerId) {
    (async () => {
      try {
        const { data: employerProfile } = await supabase
          .from("profiles")
          .select("email, full_name, company_name")
          .eq("id", employerId)
          .maybeSingle();

        if (employerProfile?.email) {
          const emailData = applicationReceivedEmail({
            employerName:
              employerProfile.full_name ||
              employerProfile.company_name ||
              "Employer",
            studentName: profile?.full_name || "A student",
            role: internship.role || "Internship",
            reviewLink: `${getAppUrl()}/dashboard/employer/internships/${internship.id}`,
          });
          await sendEmail({
            to: employerProfile.email,
            subject: emailData.subject,
            html: emailData.html,
          });
        }
      } catch (err) {
        console.error("Failed to send employer application email:", err);
      }
    })();
  }

  return NextResponse.json({
    message: "Application submitted successfully",
    id: newApp?.id,
  });
}
