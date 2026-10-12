"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, CheckCircle2, AlertCircle, X, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { cx } from "@/utils/cx";

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

// Notification types that also pop up on screen as soon as they arrive.
const POPUP_TYPES = new Set([
  "cv_analysis_complete",
  "cv_analysis_failed",
  "application_update",
  "new_application",
  "deadline_reminder",
]);
const POPUP_MS = 10000;

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<Notification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Dismiss popup timer
  useEffect(() => {
    if (!popup) return;
    const timer = setTimeout(() => setPopup(null), POPUP_MS);
    return () => clearTimeout(timer);
  }, [popup]);

  // Fetch initial notifications and unread count
  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      // 1. Fetch exact unread count
      const { count: unread } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (typeof unread === "number") {
        setUnreadCount(unread);
      }

      // 2. Fetch recent notifications
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(25);

      if (error) {
        console.error("Failed to fetch notifications:", error.message);
      } else if (data) {
        setNotifications(data as Notification[]);
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // Realtime subscription scoped to user
  useEffect(() => {
    if (!userId) return;

    const channelName = `user-notifications-${userId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notif = payload.new as Notification;
          setNotifications((prev) => [notif, ...prev]);
          setUnreadCount((c) => c + 1);

          if (POPUP_TYPES.has(notif.type)) {
            setPopup(notif);
            router.refresh();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n)),
          );
          // Recalculate unread count
          void supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("is_read", false)
            .then(({ count }) => {
              if (typeof count === "number") setUnreadCount(count);
            });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  const handleMarkAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", userId);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  };

  const handleMarkAllRead = async () => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  const openNotification = (notif: Notification) => {
    if (!notif.is_read) {
      void handleMarkAsRead(notif.id);
    }
    setPopup(null);
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {popup && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-6 right-6 z-[100] w-[calc(100%-3rem)] max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex items-start gap-3">
            {popup.type === "cv_analysis_failed" ? (
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">{popup.title}</p>
              {popup.body && (
                <p className="text-xs text-slate-500 mt-0.5">{popup.body}</p>
              )}
              {popup.link && (
                <button
                  type="button"
                  onClick={() => openNotification(popup)}
                  className="mt-2 text-xs font-semibold text-brand hover:underline"
                >
                  {popup.type === "cv_analysis_failed"
                    ? "Try again"
                    : popup.type === "application_update"
                      ? "View application"
                      : popup.type === "new_application"
                        ? "Review applicant"
                        : "View details"}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPopup(null)}
              aria-label="Dismiss alert"
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notifications"
        aria-expanded={isOpen}
        className="relative p-2.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand/20"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full min-w-4.5 h-4.5 px-1 flex items-center justify-center font-bold shadow-sm animate-in zoom-in-75">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="region"
          aria-label="Notifications list"
          className="absolute right-0 top-12 w-80 sm:w-96 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-800">Notifications</span>
              {unreadCount > 0 && (
                <span className="bg-brand/10 text-brand text-xs px-2 py-0.5 rounded-full font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-brand hover:underline font-semibold flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-brand mb-2" />
                <p>Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-medium text-slate-600">No notifications yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  We will notify you about applications, messages, and updates.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => openNotification(notif)}
                  className={cx(
                    "w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-start gap-3 relative",
                    !notif.is_read ? "bg-indigo-50/30" : "bg-white",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                      )}
                    </div>
                    {notif.body && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {notif.body}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-2 font-medium">
                      {new Date(notif.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
