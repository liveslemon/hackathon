# NEW FEATURE: In-App Notifications

## Priority: 🟠 HIGH

## Effort: High (6-8 hours)

## Overview

Add a real-time notification system that alerts all user roles about relevant events. Uses Supabase Realtime subscriptions for instant delivery and a notifications table for persistence.

## Events That Trigger Notifications

### For Employers:

- New application received
- Logbook entry submitted by intern
- Posting deadline approaching (3 days before)
- Application withdrawn by student

### For Students:

- Application stage changed (reviewed, shortlisted, interview, offered, accepted, rejected)
- Logbook entry approved/flagged
- New posting from followed company
- Internship deadline approaching

### For Admins:

- New employer registered (verification needed)
- Flagged content reported
- Platform milestone (100th posting, etc.)

## Implementation

### 1. Database Schema

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'new_application', 'stage_change', 'logbook_submitted', etc.
  title TEXT NOT NULL,
  body TEXT,
  link TEXT, -- URL to navigate to when clicked
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}', -- extra context (application_id, internship_id, etc.)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### 2. Notification Service: `lib/notifications.ts`

```tsx
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
    .eq("user_id", userId); // RLS safety
}

export async function markAllAsRead(userId: string) {
  const supabase = await getSupabaseServer();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
}
```

### 3. Notification Bell Component: `components/NotificationBell.tsx`

```tsx
"use client";
import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cx } from "@/utils/cx";

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Fetch initial notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setNotifications(data);
    };
    fetchNotifications();
  }, [userId]);

  // Subscribe to realtime inserts
  useEffect(() => {
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleMarkAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
  };

  const handleMarkAllRead = async () => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-slate-100"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-white border rounded-2xl shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b">
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-brand hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="divide-y">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                No notifications yet
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => {
                    handleMarkAsRead(notif.id);
                    if (notif.link) window.location.href = notif.link;
                  }}
                  className={cx(
                    "w-full text-left p-4 hover:bg-slate-50 transition-colors",
                    !notif.is_read && "bg-brand/5",
                  )}
                >
                  <p className="text-sm font-medium text-slate-800">
                    {notif.title}
                  </p>
                  {notif.body && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {notif.body}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(notif.created_at).toLocaleDateString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 4. Integrate Bell into TopBar/DashboardShell

In `components/TopBar.tsx` or `components/DashboardShell.tsx`:

```tsx
import { NotificationBell } from "@/components/NotificationBell";

// In the header area:
<NotificationBell userId={user.id} />;
```

### 5. Trigger Notifications on Events

When an application is submitted (in the apply API route or Supabase trigger):

```tsx
// After student applies:
await createNotification({
  userId: internship.employer_id,
  type: "new_application",
  title: "New Application",
  body: `${studentName} applied for ${internship.role}`,
  link: `/dashboard/employer/internships/${internship.id}`,
  metadata: { application_id: application.id },
});
```

When employer changes application stage:

```tsx
await createNotification({
  userId: application.student_id,
  type: "stage_change",
  title: `Application Update: ${internship.role}`,
  body: `Your application moved to "${newStage}"`,
  link: `/my-internships`,
  metadata: { stage: newStage, internship_id: internship.id },
});
```

### 6. Supabase Database Function (Alternative: Server-Side Trigger)

```sql
-- Trigger to auto-create notification when application is inserted
CREATE OR REPLACE FUNCTION notify_employer_on_application()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, link, metadata)
  SELECT
    i.employer_id,
    'new_application',
    'New Application Received',
    (SELECT full_name FROM profiles WHERE id = NEW.student_id) || ' applied for ' || i.role,
    '/dashboard/employer/internships/' || NEW.internship_id,
    jsonb_build_object('application_id', NEW.id, 'internship_id', NEW.internship_id)
  FROM internships i WHERE i.id = NEW.internship_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_employer_on_application
AFTER INSERT ON applied_internships
FOR EACH ROW EXECUTE FUNCTION notify_employer_on_application();
```

## Integration with Other Roles

- **All roles** get the same `NotificationBell` component — filtered by their `user_id`
- **Student notifications**: application updates, logbook feedback, new postings from followed companies
- **Employer notifications**: new applications, logbook submissions, deadline reminders
- **Admin notifications**: new registrations, flagged content, platform milestones

## Acceptance Criteria

- [ ] `notifications` table created with proper indexes
- [ ] `NotificationBell` component renders in top bar for all roles
- [ ] Real-time notifications via Supabase Realtime (no page refresh needed)
- [ ] Unread count badge on bell icon
- [ ] Click notification → marks as read + navigates to relevant page
- [ ] "Mark all as read" button
- [ ] Notifications triggered on: new application, stage change, logbook submit, logbook review
- [ ] Notification dropdown shows last 20 notifications
- [ ] Empty state when no notifications
- [ ] Notifications auto-appear without refresh (realtime subscription)


STATUS: COMPLETE
