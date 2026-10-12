import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { updateInternshipSchema } from "@/lib/validations/employer";

export async function PATCH(
  req: Request,
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
    .from("internships")
    .select("employer_id, poster_id")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Internship not found" }, { status: 404 });
  }

  const isOwner = existing.employer_id === user.id || existing.poster_id === user.id;
  if (!isOwner) {
    return NextResponse.json({ error: "Forbidden: Not the internship owner" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateInternshipSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = {};

  if (data.role !== undefined) updateData.role = data.role;
  if (data.field !== undefined) updateData.field = data.field;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.requirements !== undefined) updateData.requirements = data.requirements;
  if (data.location !== undefined) updateData.location = data.location;
  if (data.duration !== undefined) updateData.duration = data.duration;
  if (data.stipend !== undefined) updateData.stipend = data.stipend;
  if (data.slots !== undefined) updateData.slots = data.slots;
  if (data.status !== undefined) updateData.status = data.status;

  if (data.deadline !== undefined) {
    updateData.deadline = data.deadline ? new Date(data.deadline).toISOString() : null;
  }

  if (data.recruiter_link !== undefined) {
    updateData.recruiter_link = data.recruiter_link || null;
  } else if (data.link !== undefined) {
    updateData.recruiter_link = data.link || null;
  }

  if (data.interests !== undefined) {
    updateData.interests = data.interests;
  } else if (data.tags !== undefined) {
    updateData.interests = data.tags.split(",").map((t) => t.trim()).filter(Boolean);
  }

  if (data.required_skills !== undefined) {
    updateData.required_skills = Array.isArray(data.required_skills)
      ? data.required_skills
      : data.required_skills.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const { error } = await supabase
    .from("internships")
    .update(updateData)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, updated: updateData });
}

export async function DELETE(
  req: Request,
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
    .from("internships")
    .select("employer_id, poster_id")
    .eq("id", id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Internship not found" }, { status: 404 });
  }

  const isOwner = existing.employer_id === user.id || existing.poster_id === user.id;
  if (!isOwner) {
    return NextResponse.json({ error: "Forbidden: Not the internship owner" }, { status: 403 });
  }

  const { error } = await supabase
    .from("internships")
    .update({ status: "deleted" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: "deleted" });
}