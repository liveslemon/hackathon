import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { createNotification } from "@/lib/notifications";
import { messageInputSchema } from "@/lib/validations/employer";

function sanitizeMessage(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = messageInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const sanitized = sanitizeMessage(parsed.data.content);
  if (!sanitized) {
    return NextResponse.json(
      { error: "Message cannot be empty after sanitization" },
      { status: 400 },
    );
  }

  // Verify user is participant
  const { data: convo } = await supabase
    .from("conversations")
    .select("employer_id, student_id")
    .eq("id", conversationId)
    .single();

  if (!convo || (convo.employer_id !== user.id && convo.student_id !== user.id)) {
    return NextResponse.json({ error: "Forbidden: Not a conversation participant" }, { status: 403 });
  }

  const { data: msg, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: sanitized,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify the other party
  const recipientId =
    user.id === convo.employer_id ? convo.student_id : convo.employer_id;

  try {
    await createNotification({
      userId: recipientId,
      type: "new_message",
      title: "New Message",
      body: sanitized.slice(0, 50) + (sanitized.length > 50 ? "..." : ""),
      link: `/messages/${conversationId}`,
    });
  } catch (notifErr) {
    console.error("Failed to notify recipient:", notifErr);
  }

  return NextResponse.json(msg);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await params;

  const { data: convo } = await supabase
    .from("conversations")
    .select("employer_id, student_id")
    .eq("id", conversationId)
    .single();

  if (!convo || (convo.employer_id !== user.id && convo.student_id !== user.id)) {
    return NextResponse.json({ error: "Forbidden: Not a conversation participant" }, { status: 403 });
  }

  // Automatically mark unread messages from the other party as read
  await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", user.id)
    .eq("is_read", false);

  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(messages || []);
}
