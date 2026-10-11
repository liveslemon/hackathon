import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const [supabase, body] = await Promise.all([getSupabaseServer(), req.json()]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { student_id, employer_id, activities_raw, activities_enhanced } = body;

  if (!student_id || !employer_id || !activities_raw) {
    return NextResponse.json(
      { error: "student_id, employer_id, and activities_raw are required" },
      { status: 400 },
    );
  }

  if (student_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("logbook_entries")
    .upsert(
      {
        student_id,
        employer_id,
        date: today,
        activities_raw,
        activities_enhanced: activities_enhanced || null,
        status: "pending",
      },
      { onConflict: "student_id,date" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data });
}
