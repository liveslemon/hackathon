import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

const VALID_STATUSES = ["pending", "accepted", "rejected"];

export async function PUT(req: Request, { params }: any) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await req.json();

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const { data: application } = await supabase
    .from("applied_internships")
    .select("id, internship_id, internships(employer_id)")
    .eq("id", (await params).id)
    .single();

  if (!application)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if ((application.internships as any)?.employer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("applied_internships")
    .update({ status })
    .eq("id", (await params).id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
