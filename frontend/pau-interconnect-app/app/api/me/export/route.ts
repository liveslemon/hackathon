import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// "Download my data": everything the platform holds about the signed-in user,
// read with their own session (RLS limits every query to their rows).
export async function GET() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile, applications, logbook, matches, saved, notifications] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("applied_internships")
        .select("*, internships(role, company)")
        .eq("user_id", user.id),
      supabase.from("logbook_entries").select("*").eq("student_id", user.id),
      supabase
        .from("match_results")
        .select("internship_id, match_score, matching_skills, missing_skills, reasoning, updated_at")
        .eq("user_id", user.id),
      supabase.from("saved_internships").select("*").eq("user_id", user.id),
      supabase.from("notifications").select("*").eq("user_id", user.id),
    ]);

  // The embedding is a 1024-number vector derived from the CV, not useful to a person.
  const profileData = profile.data ? { ...profile.data } : null;
  if (profileData) delete (profileData as Record<string, unknown>).cv_embedding;

  const body = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
    profile: profileData,
    applications: applications.data ?? [],
    logbook_entries: logbook.data ?? [],
    internship_matches: matches.data ?? [],
    saved_internships: saved.data ?? [],
    notifications: notifications.data ?? [],
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="pau-interconnect-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
