import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

// End the student's active placement. Its logbook becomes read-only and they
// can accept a new offer. The database trigger enforces who may do this.
export async function POST(
  _req: Request,
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
  const { data: application } = await supabase
    .from("applied_internships")
    .select("id, user_id, placement_status, internship_id, internships(employer_id, poster_id)")
    .eq("id", id)
    .maybeSingle();

  if (!application) {
    return NextResponse.json({ error: "Placement not found" }, { status: 404 });
  }

  // Authorization: Only the student or supervising employer can mark placement complete
  const isStudent = application.user_id === user.id;
  const internship = Array.isArray(application.internships)
    ? application.internships[0]
    : application.internships;
  const isEmployer =
    internship?.employer_id === user.id || internship?.poster_id === user.id;

  if (!isStudent && !isEmployer) {
    return NextResponse.json(
      { error: "Forbidden: Not authorized to complete this placement" },
      { status: 403 },
    );
  }

  if (application.placement_status !== "active") {
    return NextResponse.json(
      { error: "This internship placement isn't active." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("applied_internships")
    .update({
      placement_status: "completed",
      ended_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ completed: true });
}

