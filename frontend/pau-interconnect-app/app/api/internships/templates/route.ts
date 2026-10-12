import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { internshipTemplateSchema } from "@/lib/validations/employer";

export async function GET() {
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

  return NextResponse.json(data || []);
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify employer role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "employer") {
    return NextResponse.json({ error: "Forbidden: Only employers can create templates" }, { status: 403 });
  }

  // Check template limit (max 20 per employer)
  const { count, error: countError } = await supabase
    .from("internship_templates")
    .select("id", { count: "exact", head: true })
    .eq("employer_id", user.id);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if ((count ?? 0) >= 20) {
    return NextResponse.json(
      { error: "Maximum of 20 templates allowed per employer" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = internshipTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const {
    name,
    role,
    field,
    category,
    description,
    requirements,
    tags,
    location,
    duration,
    stipend,
    recruiter_link,
  } = parsed.data;

  const parsedTags = Array.isArray(tags)
    ? tags
    : typeof tags === "string" && tags
      ? tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

  const { data, error } = await supabase
    .from("internship_templates")
    .insert([
      {
        employer_id: user.id,
        name,
        role: role || null,
        field: field || null,
        category: category || null,
        description: description || null,
        requirements: requirements || null,
        tags: parsedTags,
        location: location || null,
        duration: duration || null,
        stipend: stipend || null,
        recruiter_link: recruiter_link || null,
      },
    ])
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data.id }, { status: 201 });
}