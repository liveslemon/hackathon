import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("internship_templates")
    .select("*")
    .eq("employer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: countData } = await supabase
    .from("internship_templates")
    .select("id", { count: "exact", head: true })
    .eq("employer_id", user.id);

  const count = (countData as any) || 0;
  if (count >= 20) {
    return NextResponse.json(
      { error: "Maximum of 20 templates allowed per employer" },
      { status: 400 },
    );
  }

  const body = await req.json();

  const { data, error } = await supabase
    .from("internship_templates")
    .insert([
      {
        employer_id: user.id,
        name: body.name,
        role: body.role,
        field: body.field,
        category: body.category,
        description: body.description,
        requirements: body.requirements,
        tags: body.tags,
        location: body.location,
        duration: body.duration,
        stipend: body.stipend,
        recruiter_link: body.recruiter_link,
      },
    ])
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data.id }, { status: 201 });
}