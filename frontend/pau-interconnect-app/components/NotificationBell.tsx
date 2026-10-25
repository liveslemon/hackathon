"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Bell,
  AlertCircle,
  X,
  CheckCheck,
  Briefcase,
  FileText,
  Calendar,
  Sparkles,
  Info,
} from "lucide-react";
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
      const { count: unread } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (typeof unread === "number") {
        setUnreadCount(unread);
      }

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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "cv_analysis_complete":
        return <Sparkles className="w-4 h-4 text-brand" />;
      case "cv_analysis_failed":
        return <AlertCircle className="w-4 h-4 text-danger" />;
      case "application_update":
      case "new_application":
        return <Briefcase className="w-4 h-4 text-info" />;
      case "deadline_reminder":
        return <Calendar className="w-4 h-4 text-warning" />;
      case "logbook_update":
        return <FileText className="w-4 h-4 text-success" />;
      default:
        return <Info className="w-4 h-4 text-brand-secondary" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {popup && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-6 right-6 z-[100] w-[calc(100%-3rem)] max-w-sm rounded-2xl border border-border bg-surface-raised p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-surface-sunken shrink-0 mt-0.5">
              {getNotificationIcon(popup.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-fg">{popup.title}</p>
              {popup.body && (
                <p className="text-xs text-fg-muted mt-0.5">{popup.body}</p>
              )}
              {popup.link && (
                <button
                  type="button"
                  onClick={() => openNotification(popup)}
                  className="mt-2 text-xs font-semibold text-brand hover:underline cursor-pointer"
                >
                  View details
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPopup(null)}
              aria-label="Dismiss alert"
              className="p-1.5 rounded-lg text-fg-subtle hover:bg-surface-sunken hover:text-fg transition-colors cursor-pointer"
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
        className="relative p-2.5 rounded-xl hover:bg-surface-sunken transition-colors text-fg-muted hover:text-fg focus:outline-none focus:ring-2 focus:ring-focus-ring cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-danger text-on-danger text-[10px] font-bold flex items-center justify-center border-2 border-surface animate-in zoom-in duration-200">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="region"
          aria-label="Notifications List"
          className="absolute right-0 mt-2 w-80 md:w-96 rounded-3xl bg-surface-raised border border-border shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-sunken/40">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-fg">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-subtle text-brand">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-brand hover:underline flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-border no-scrollbar">
            {loading ? (
              <div className="p-8 text-center text-xs text-fg-muted">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-surface-sunken flex items-center justify-center mx-auto mb-3 text-fg-subtle">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-fg">No notifications</p>
                <p className="text-xs text-fg-muted mt-1">
                  You are all caught up!
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => openNotification(notif)}
                  className={cx(
                    "p-4 transition-colors flex items-start gap-3 cursor-pointer",
                    notif.is_read
                      ? "hover:bg-surface-sunken/40 opacity-70"
                      : "bg-brand-subtle/30 hover:bg-brand-subtle/50",
                  )}
                >
                  <div className="p-2 rounded-xl bg-surface border border-border shrink-0 mt-0.5">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cx(
                        "text-xs text-fg",
                        !notif.is_read ? "font-bold" : "font-medium",
                      )}
                    >
                      {notif.title}
                    </p>
                    {notif.body && (
                      <p className="text-[11px] text-fg-muted mt-0.5 line-clamp-2">
                        {notif.body}
                      </p>
                    )}
                    <span className="text-[10px] text-fg-subtle mt-1 block">
                      {new Date(notif.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
