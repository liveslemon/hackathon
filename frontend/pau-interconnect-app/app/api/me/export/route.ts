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

  // 1. Fetch user profile
  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const isEmployer = rawProfile?.role === "employer";

  // 2. Fetch all related entities based on role
  const [
    applications,
    logbook,
    matches,
    saved,
    notifications,
    conversations,
    directMessages,
    cvVersions,
    employerInternships,
  ] = await Promise.all([
    // Student applications (or applications received if employer)
    isEmployer
      ? supabase
          .from("applied_internships")
          .select("id, internship_id, user_id, cover_letter, status, match_score, created_at, internships!inner(role, company, poster_id, employer_id)")
          .or(`internships.employer_id.eq.${user.id},internships.poster_id.eq.${user.id}`)
      : supabase
          .from("applied_internships")
          .select("*, internships(role, company, category, location)")
          .eq("user_id", user.id),

    // Logbook entries (written by student, or supervised by employer)
    isEmployer
      ? supabase
          .from("logbook_entries")
          .select("*")
          .eq("employer_id", user.id)
      : supabase
          .from("logbook_entries")
          .select("*")
          .eq("student_id", user.id),

    // Internship matches (student only)
    !isEmployer
      ? supabase
          .from("match_results")
          .select("internship_id, match_score, matching_skills, missing_skills, reasoning, updated_at")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] }),

    // Saved internships (student only)
    !isEmployer
      ? supabase
          .from("saved_internships")
          .select("*")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] }),

    // In-app notifications
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id),

    // Conversations involving this user
    supabase
      .from("conversations")
      .select("*, messages(*)")
      .or(isEmployer ? `employer_id.eq.${user.id}` : `student_id.eq.${user.id}`),

    // All messages sent by this user
    supabase
      .from("messages")
      .select("*")
      .eq("sender_id", user.id),

    // CV versions uploaded by this user (if student)
    !isEmployer
      ? supabase
          .from("cv_versions")
          .select("version, cv_url, text_length, ats_score, processed_at, created_at")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] }),

    // Internships posted by employer (if employer)
    isEmployer
      ? supabase
          .from("internships")
          .select("*")
          .or(`poster_id.eq.${user.id},employer_id.eq.${user.id}`)
      : Promise.resolve({ data: [] }),
  ]);

  // Strip vector embeddings (1024-number vector, internal algorithm state)
  const profileData = rawProfile ? { ...rawProfile } : null;
  if (profileData) {
    delete (profileData as Record<string, unknown>).cv_embedding;
  }

  const exportDate = new Date().toISOString().slice(0, 10);
  const body = {
    exported_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    },
    profile: profileData,
    cv_link: profileData?.cv_url || null,
    cv_history: cvVersions.data ?? [],
    applications: applications.data ?? [],
    logbook_entries: logbook.data ?? [],
    internship_matches: matches.data ?? [],
    saved_internships: saved.data ?? [],
    conversations: conversations.data ?? [],
    sent_messages: directMessages.data ?? [],
    notifications: notifications.data ?? [],
    ...(isEmployer ? { posted_internships: employerInternships.data ?? [] } : {}),
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="pau-interconnect-data-${user.id.slice(0, 8)}-${exportDate}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

