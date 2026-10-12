"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { cx } from "@/utils/cx";
import { Button } from "@/components/ui";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read?: boolean;
}

export function MessageThread({
  conversationId,
  currentUserId,
}: {
  conversationId: string;
  currentUserId: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages/${conversationId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  }, [conversationId]);

  useEffect(() => {
    fetchMessages().then(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    });
  }, [fetchMessages]);

  // Polling fallback every 6 seconds to ensure reliable messaging
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages();
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setNewMessage("");

    try {
      const res = await fetch(`/api/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      if (res.ok) {
        const sentMsg = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg];
        });
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 50);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[260px] text-slate-400 text-sm italic">
            No messages yet. Send a message to start the conversation.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={cx(
                  "w-max max-w-[75%] p-3.5 rounded-2xl text-sm leading-relaxed",
                  isMe
                    ? "ml-auto bg-brand text-white rounded-tr-sm"
                    : "mr-auto bg-slate-100 text-slate-800 rounded-tl-sm",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <span
                  className={cx(
                    "block text-[10px] mt-1 text-right",
                    isMe ? "text-white/70" : "text-slate-400",
                  )}
                >
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3 bg-slate-50 flex gap-2 items-center">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          maxLength={5000}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
        />
        <Button onClick={sendMessage} size="sm" isLoading={sending} disabled={!newMessage.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
