import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ targetId: string }> },
) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { targetId } = await params;

  // Check admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_admin")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.is_admin === true || profile?.role === "admin";

  if (!isAdmin) {
    // Check if target is an application
    const { data: application } = await supabase
      .from("applied_internships")
      .select("id, user_id, internships(employer_id, poster_id)")
      .eq("id", targetId)
      .maybeSingle();

    if (application) {
      const internship = Array.isArray(application.internships)
        ? application.internships[0]
        : application.internships;
      const isEmployer =
        internship?.employer_id === user.id || internship?.poster_id === user.id;
      const isApplicant = application.user_id === user.id;

      if (!isEmployer && !isApplicant) {
        return NextResponse.json(
          { error: "Forbidden: Not authorized to view audit trail for this application" },
          { status: 403 },
        );
      }
    } else {
      // Check if target is an internship
      const { data: internship } = await supabase
        .from("internships")
        .select("id, employer_id, poster_id")
        .eq("id", targetId)
        .maybeSingle();

      if (internship) {
        const isOwner =
          internship.employer_id === user.id || internship.poster_id === user.id;
        if (!isOwner) {
          return NextResponse.json(
            { error: "Forbidden: Not authorized to view audit trail for this internship" },
            { status: 403 },
          );
        }
      } else {
        // Check if user is actor in any audit record for this target
        const { count } = await supabase
          .from("decision_audit_log")
          .select("id", { count: "exact", head: true })
          .eq("target_id", targetId)
          .eq("actor_id", user.id);

        if (!count || count === 0) {
          return NextResponse.json(
            { error: "Forbidden: Not authorized to view audit trail" },
            { status: 403 },
          );
        }
      }
    }
  }

  const { data, error } = await supabase
    .from("decision_audit_log")
    .select("*")
    .eq("target_id", targetId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
