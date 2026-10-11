import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { isOpenInternship } from "@/lib/internship-columns";

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

  const [{ data: internship }, { data: match }] = await Promise.all([
    supabase
      .from("internships")
      .select("status, deadline")
      .eq("id", internship_id)
      .maybeSingle(),
    supabase
      .from("match_results")
      .select("match_score")
      .eq("user_id", user.id)
      .eq("internship_id", internship_id)
      .maybeSingle(),
  ]);

  if (!internship) {
    return NextResponse.json({ error: "Internship not found" }, { status: 404 });
  }
  if (!isOpenInternship(internship)) {
    return NextResponse.json(
      { error: "This internship is no longer accepting applications" },
      { status: 410 },
    );
  }

  // Insert directly — the UNIQUE(user_id, internship_id) constraint
  // handles duplicate prevention without a separate query. match_score lets
  // employers rank applicants.
  const { error } = await supabase.from("applied_internships").insert({
    user_id: user.id,
    internship_id,
    cover_letter: cover_letter || null,
    stage: "applied",
    match_score: match?.match_score ?? null,
  });

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

  return NextResponse.json({ message: "Application submitted successfully" });
}
