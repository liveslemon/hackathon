"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { cx } from "@/utils/cx";
import { Button } from "@/components/ui";
import { Send, Check, CheckCheck } from "lucide-react";

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

  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages();
    }, 6000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

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
        }, 100);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[520px] rounded-3xl border border-border bg-surface overflow-hidden shadow-sm">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-surface-sunken/30">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-fg-muted p-4">
            <p className="text-sm font-semibold text-fg">No messages yet</p>
            <p className="text-xs text-fg-muted mt-1">
              Start the conversation by typing below.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={cx(
                  "flex flex-col max-w-[80%] md:max-w-[70%]",
                  isMe ? "ml-auto items-end" : "mr-auto items-start",
                )}
              >
                <div
                  className={cx(
                    "px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
                    isMe
                      ? "bg-brand text-brand-fg rounded-br-xs"
                      : "bg-surface border border-border text-fg rounded-bl-xs",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
                <div className="flex items-center gap-1 mt-1 px-1 text-[10px] text-fg-subtle">
                  <span>
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {isMe && (
                    <span>
                      {msg.is_read ? (
                        <CheckCheck className="w-3 h-3 text-brand" />
                      ) : (
                        <Check className="w-3 h-3 text-fg-subtle" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="p-3 md:p-4 border-t border-border bg-surface flex items-center gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={sending}
          className="flex-1 bg-surface-sunken border border-border rounded-xl px-4 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/20 focus-visible:border-brand min-h-[42px]"
        />
        <Button
          onClick={sendMessage}
          disabled={!newMessage.trim() || sending}
          isLoading={sending}
          size="sm"
          className="min-h-[42px] px-4 rounded-xl"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
export default MessageThread;
