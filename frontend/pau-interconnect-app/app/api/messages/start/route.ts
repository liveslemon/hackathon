import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { createNotification } from "@/lib/notifications";

export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { application_id, message } = await req.json();

  const { data: application } = await supabase
    .from("applied_internships")
    .select("student_id, internships(employer_id)")
    .eq("id", application_id)
    .single();

  if (
    !application ||
    (application.internships as any)?.employer_id !== user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("application_id", application_id)
    .single();

  let conversationId = existing?.id;
  if (!conversationId) {
    const { data: newConvo } = await supabase
      .from("conversations")
      .insert({
        application_id,
        employer_id: user.id,
        student_id: application.student_id,
      })
      .select("id")
      .single();
    conversationId = newConvo?.id;
  }

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: message,
  });

  await createNotification({
    userId: application.student_id,
    type: "new_message",
    title: "New Message",
    body: `You have a message about your application`,
    link: `/messages/${conversationId}`,
  });

  return NextResponse.json({ conversation_id: conversationId });
}
