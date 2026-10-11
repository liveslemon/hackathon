import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function PATCH(
  req: Request,
  { params }: any,
) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabase
    .from("internships")
    .select("employer_id")
    .eq("id", (await params).id)
    .single();

  if (!existing || existing.employer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  // Strip fields that shouldn't be updated or don't exist on the table
  const { id, employer_id, company, created_at, tags, link, ...updateData } = body;

  const { error } = await supabase
    .from("internships")
    .update(updateData)
    .eq("id", (await params).id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: Request,
  { params }: any,
) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: existing } = await supabase
    .from("internships")
    .select("employer_id")
    .eq("id", (await params).id)
    .single();

  if (!existing || existing.employer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("internships")
    .update({ status: "deleted" })
    .eq("id", (await params).id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}