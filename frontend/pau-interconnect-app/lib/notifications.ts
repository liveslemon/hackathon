import { getSupabaseServer } from "@/lib/supabase-server";

interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput) {
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("notifications").insert({
    user_id: input.userId,
    type: input.type,
    title: input.title,
    body: input.body || null,
    link: input.link || null,
    metadata: input.metadata || {},
  });
  if (error) console.error("Failed to create notification:", error);
}

export async function markAsRead(notificationId: string, userId: string) {
  const supabase = await getSupabaseServer();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);
}

export async function markAllAsRead(userId: string) {
  const supabase = await getSupabaseServer();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
}
