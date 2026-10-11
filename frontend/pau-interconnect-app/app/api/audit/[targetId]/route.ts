import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: Request, { params }: any) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("decision_audit_log")
    .select("*")
    .eq("target_id", (await params).targetId)
    .order("created_at", { ascending: true });

  return NextResponse.json(data || []);
}
