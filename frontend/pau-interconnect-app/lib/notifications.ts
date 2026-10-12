import { getSupabaseServer } from "@/lib/supabase-server";

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  is_read: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// Map notification types to the settings preference keys that control them.
// Recipient can switch these off in Settings (student/employer).
export const NOTIFICATION_OPT_OUT_MAP: Record<string, string[]> = {
  new_message: ["employer_messages", "messages"],
  new_application: ["new_application", "email_new_applicant"],
  application_update: ["application_updates", "email_status_updates"],
  application_status: ["application_updates", "email_status_updates"],
  logbook_approved: ["logbook_updates"],
  logbook_flagged: ["logbook_updates", "email_logbook_submitted"],
  logbook_reminder: ["logbook_updates", "email_logbook_submitted"],
  deadline_reminder: ["deadline_reminders", "email_deadline_reminder"],
  new_match: ["new_match", "recommendations", "job_recommendations"],
};

/**
 * Checks if a recipient has opted out of notifications of the given type.
 */
export async function isNotificationOptedOut(
  userId: string,
  type: string,
): Promise<boolean> {
  const prefKeys = NOTIFICATION_OPT_OUT_MAP[type];
  if (!prefKeys || prefKeys.length === 0) return false;

  try {
    const supabase = await getSupabaseServer();
    const { data: recipient } = await supabase
      .from("profiles")
      .select("settings, notification_preferences")
      .eq("id", userId)
      .maybeSingle();

    if (!recipient) return false;

    const modernPrefs = (
      recipient.settings as { notifications?: Record<string, unknown> } | null
    )?.notifications;
    const legacyPrefs = recipient.notification_preferences as Record<string, unknown> | null;

    for (const key of prefKeys) {
      if (modernPrefs?.[key] === false || legacyPrefs?.[key] === false) {
        return true;
      }
    }
  } catch (err) {
    console.warn("Failed checking notification opt-out preferences:", err);
  }

  return false;
}

export async function createNotification(
  input: CreateNotificationInput,
): Promise<{ success: boolean; id?: string; skipped?: boolean; reason?: string }> {
  if (!input.userId || !input.type || !input.title) {
    return { success: false, reason: "Missing required notification fields (userId, type, title)" };
  }

  const optedOut = await isNotificationOptedOut(input.userId, input.type);
  if (optedOut) {
    return { success: true, skipped: true, reason: "User opted out of this notification type" };
  }

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body || null,
      link: input.link || null,
      metadata: input.metadata || {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create notification:", error);
    return { success: false, reason: error.message };
  }

  return { success: true, id: data?.id };
}

export async function markAsRead(
  notificationId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!notificationId || !userId) {
    return { success: false, error: "Missing notificationId or userId" };
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to mark notification as read:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function markAllAsRead(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!userId) {
    return { success: false, error: "Missing userId" };
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error("Failed to mark all notifications as read:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getUnreadCount(userId: string): Promise<number> {
  if (!userId) return 0;
  const supabase = await getSupabaseServer();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    console.error("Failed to fetch unread notification count:", error);
    return 0;
  }

  return count || 0;
}

export async function getUserNotifications(
  userId: string,
  limit: number = 20,
): Promise<NotificationRecord[]> {
  if (!userId) return [];
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to fetch user notifications:", error);
    return [];
  }

  return (data as NotificationRecord[]) || [];
}
