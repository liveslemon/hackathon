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

export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { application_id?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { application_id, message } = body;
  if (!application_id) {
    return NextResponse.json({ error: "application_id is required" }, { status: 400 });
  }

  const parsed = messageInputSchema.safeParse({ content: message || "" });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const sanitizedContent = sanitizeMessage(parsed.data.content);
  if (!sanitizedContent) {
    return NextResponse.json({ error: "Message cannot be empty after sanitization" }, { status: 400 });
  }

  // Verify the user is the employer for this application
  // Note: the student reference column in applied_internships is user_id
  const { data: application } = await supabase
    .from("applied_internships")
    .select("id, user_id, internship_id, internships(employer_id, poster_id, role)")
    .eq("id", application_id)
    .single();

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const internship = Array.isArray(application.internships)
    ? application.internships[0]
    : application.internships;

  const isEmployer =
    internship?.employer_id === user.id || internship?.poster_id === user.id;

  if (!isEmployer) {
    return NextResponse.json({ error: "Forbidden: Not authorized to start conversation" }, { status: 403 });
  }

  const studentId = application.user_id;

  // Idempotently create or find conversation
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("application_id", application_id)
    .maybeSingle();

  let conversationId = existing?.id;
  if (!conversationId) {
    const { data: newConvo, error: insertError } = await supabase
      .from("conversations")
      .insert({
        application_id,
        employer_id: user.id,
        student_id: studentId,
      })
      .select("id")
      .single();

    if (insertError) {
      // If unique constraint conflict occurred concurrently, re-fetch
      const { data: retryExisting } = await supabase
        .from("conversations")
        .select("id")
        .eq("application_id", application_id)
        .single();
      conversationId = retryExisting?.id;
    } else {
      conversationId = newConvo?.id;
    }
  }

  if (!conversationId) {
    return NextResponse.json({ error: "Failed to establish conversation" }, { status: 500 });
  }

  // Insert sanitized message
  const { error: msgError } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: sanitizedContent,
  });

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 });
  }

  // Notify student
  try {
    await createNotification({
      userId: studentId,
      type: "new_message",
      title: "New Message",
      body: `You received a message regarding your application for ${internship?.role || "internship"}`,
      link: `/messages/${conversationId}`,
    });
  } catch (notifErr) {
    console.error("Failed to send message notification:", notifErr);
  }

  return NextResponse.json({ conversation_id: conversationId });
}
