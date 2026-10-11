import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { createNotification } from "@/lib/notifications";

export async function POST(
  req: Request,
  { params }: any,
) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim())
    return NextResponse.json({ error: "Empty message" }, { status: 400 });

  const { data: convo } = await supabase
    .from("conversations")
    .select("employer_id, student_id")
    .eq("id", (await params).conversationId)
    .single();

  if (
    !convo ||
    (convo.employer_id !== user.id && convo.student_id !== user.id)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: msg, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: (await params).conversationId,
      sender_id: user.id,
      content: content.trim(),
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const recipientId =
    user.id === convo.employer_id ? convo.student_id : convo.employer_id;
  await createNotification({
    userId: recipientId,
    type: "new_message",
    title: "New Message",
    body: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
    link: `/messages/${(await params).conversationId}`,
  });

  return NextResponse.json(msg);
}

export async function GET(
  req: Request,
  { params }: any,
) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: convo } = await supabase
    .from("conversations")
    .select("employer_id, student_id")
    .eq("id", (await params).conversationId)
    .single();

  if (
    !convo ||
    (convo.employer_id !== user.id && convo.student_id !== user.id)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", (await params).conversationId)
    .order("created_at", { ascending: true });

  return NextResponse.json(data);
}