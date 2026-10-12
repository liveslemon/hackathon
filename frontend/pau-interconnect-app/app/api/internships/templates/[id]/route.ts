import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function DELETE(
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

  const { data: existing } = await supabase
    .from("internship_templates")
    .select("employer_id")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  if (existing.employer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden: Not template owner" }, { status: 403 });
  }

  const { error } = await supabase
    .from("internship_templates")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
