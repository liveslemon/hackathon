"use client";
import React, { useState, useEffect } from "react";
import { Bell, CheckCircle2, AlertCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
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

// Notification types that also pop up on screen as soon as they arrive.
const POPUP_TYPES = new Set(["cv_analysis_complete", "cv_analysis_failed"]);
const POPUP_MS = 12000;

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [popup, setPopup] = useState<Notification | null>(null);
  const router = useRouter();
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!popup) return;
    const timer = setTimeout(() => setPopup(null), POPUP_MS);
    return () => clearTimeout(timer);
  }, [popup]);

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
          const notif = payload.new as Notification;
          setNotifications((prev) => [notif, ...prev]);
          if (POPUP_TYPES.has(notif.type)) {
            setPopup(notif);
            // Pages showing CV-derived data re-render with the new results.
            router.refresh();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router]);

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

  const openNotification = (notif: Notification) => {
    handleMarkAsRead(notif.id);
    setPopup(null);
    setIsOpen(false);
    if (notif.link) router.push(notif.link);
  };

  return (
    <div className="relative">
      {popup && (
        <div
          role="alert"
          className="fixed bottom-6 right-6 z-[100] w-[calc(100%-3rem)] max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl"
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
                  onClick={() => openNotification(popup)}
                  className="mt-2 text-xs font-semibold text-brand hover:underline"
                >
                  {popup.type === "cv_analysis_failed" ? "Try again" : "View results"}
                </button>
              )}
            </div>
            <button
              onClick={() => setPopup(null)}
              aria-label="Dismiss"
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
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
                  onClick={() => openNotification(notif)}
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
