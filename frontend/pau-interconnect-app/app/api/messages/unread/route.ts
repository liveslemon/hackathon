import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find conversations user is part of
  const { data: convos, error: convoError } = await supabase
    .from("conversations")
    .select("id")
    .or(`employer_id.eq.${user.id},student_id.eq.${user.id}`);

  if (convoError || !convos || convos.length === 0) {
    return NextResponse.json({ unread_count: 0 });
  }

  const convoIds = convos.map((c) => c.id);

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", convoIds)
    .neq("sender_id", user.id)
    .eq("is_read", false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ unread_count: count ?? 0 });
}
