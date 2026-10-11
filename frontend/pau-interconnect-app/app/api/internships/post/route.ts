import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { postInternshipSchema } from "@/lib/validations/employer";

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
    .select("role, company_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "employer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Validate input
  const body = await req.json();
  const parsed = postInternshipSchema.safeParse(body);

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
    role,
    field,
    category,
    description,
    requirements,
    tags,
    deadline,
    link,
    status,
  } = parsed.data;
  
  const finalStatus = status || "active";


  const { data, error } = await supabase
    .from("internships")
    .insert([
      {
        employer_id: user.id,
        company: profile.company_name,
        role,
        field,
        category,
        description,
        requirements,
        interests: tags
          ? tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        deadline: deadline ? new Date(deadline).toISOString() : null,
        recruiter_link: link || null,
        status: finalStatus,
      },
    ])
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

if (finalStatus === "active") {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { getBackendUrl } = await import("@/lib/env");
        const backendUrl = getBackendUrl();
        fetch(`${backendUrl}/api/analyze-new-internship`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ internship_id: data.id })
        }).catch((e) => console.error("Trigger analysis failed asynchronously:", e));
      }
    } catch (err) {
      console.error("Failed to trigger background analysis:", err);
    }
  }

  return NextResponse.json({ success: true, id: data.id }, { status: 201 });
}
