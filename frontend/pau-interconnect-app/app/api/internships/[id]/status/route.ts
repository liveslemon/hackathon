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

  const { status } = await req.json();
  if (!["active", "closed", "draft"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("internships")
    .select("employer_id, status")
    .eq("id", (await params).id)
    .single();

  if (!existing || existing.employer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("internships")
    .update({ status })
    .eq("id", (await params).id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
if (status === "active" && existing.status === "draft") {
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
          body: JSON.stringify({ internship_id: (await params).id })
        }).catch((e) => console.error("Trigger analysis failed asynchronously:", e));
      }
    } catch (err) {
      console.error("Failed to trigger background analysis:", err);
    }
  }

  return NextResponse.json({ success: true, status });
}