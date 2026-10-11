"use client";
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { cx } from "@/utils/cx";
import { Button } from "@/components/ui";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
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
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/messages/${conversationId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMessages(data);
        bottomRef.current?.scrollIntoView({ behavior: "instant" as any });
      });
  }, [conversationId]);

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
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new as Message];
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
    if (!newMessage.trim()) return;
    const optimisticMsg = {
      id: "temp-" + Date.now(),
      sender_id: currentUserId,
      content: newMessage,
      created_at: new Date().toISOString(),
    };
    // setMessages(p => [...p, optimisticMsg]);
    const input = newMessage;
    setNewMessage("");
    await fetch(`/api/messages/${conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: input }),
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cx(
              "w-max max-w-[70%] p-3 rounded-2xl text-sm",
              msg.sender_id === currentUserId
                ? "ml-auto bg-brand text-white rounded-tr-sm"
                : "mr-auto bg-slate-100 text-slate-800 rounded-tl-sm",
            )}
          >
            {msg.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-4 flex gap-2">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border rounded-xl text-sm focus:outline-brand focus:border-brand"
        />
        <Button onClick={sendMessage} size="sm">
          Send
        </Button>
      </div>
    </div>
  );
}
