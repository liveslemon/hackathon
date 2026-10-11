# NEW FEATURE: Messaging System

## Priority: 🟡 MEDIUM

## Effort: High (8-10 hours)

## Overview

Allow employers and students to communicate directly within the platform. Useful for interview coordination, clarifying applications, and sending informal offers. Messages are tied to specific applications to maintain context.

## Implementation

### 1. Database Schema

```sql
-- Conversations (tied to an application)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applied_internships(id) ON DELETE CASCADE,
  employer_id UUID REFERENCES profiles(id) NOT NULL,
  student_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(application_id)
);

-- Messages within a conversation
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_conversations_employer ON conversations(employer_id);
CREATE INDEX idx_conversations_student ON conversations(student_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

### 2. API Routes

**Start conversation:** `app/api/messages/start/route.ts`

```tsx
export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { application_id, message } = await req.json();

  // Verify the user is the employer for this application
  const { data: application } = await supabase
    .from("applied_internships")
    .select("student_id, internships(employer_id)")
    .eq("id", application_id)
    .single();

  if (!application || application.internships?.employer_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Create or get conversation
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("application_id", application_id)
    .single();

  let conversationId = existing?.id;
  if (!conversationId) {
    const { data: newConvo } = await supabase
      .from("conversations")
      .insert({
        application_id,
        employer_id: user.id,
        student_id: application.student_id,
      })
      .select("id")
      .single();
    conversationId = newConvo?.id;
  }

  // Send first message
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    content: message,
  });

  // Notify student
  await createNotification({
    userId: application.student_id,
    type: "new_message",
    title: "New Message",
    body: `You have a message about your application`,
    link: `/messages/${conversationId}`,
  });

  return NextResponse.json({ conversation_id: conversationId });
}
```

**Send message:** `app/api/messages/[conversationId]/route.ts`

```tsx
export async function POST(
  req: Request,
  { params }: { params: { conversationId: string } },
) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await req.json();
  if (!content?.trim())
    return NextResponse.json({ error: "Empty message" }, { status: 400 });

  // Verify user is participant
  const { data: convo } = await supabase
    .from("conversations")
    .select("employer_id, student_id")
    .eq("id", params.conversationId)
    .single();

  if (
    !convo ||
    (convo.employer_id !== user.id && convo.student_id !== user.id)
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: msg, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: params.conversationId,
      sender_id: user.id,
      content: content.trim(),
    })
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify the other party
  const recipientId =
    user.id === convo.employer_id ? convo.student_id : convo.employer_id;
  await createNotification({
    userId: recipientId,
    type: "new_message",
    title: "New Message",
    body: content.slice(0, 50) + (content.length > 50 ? "..." : ""),
    link: `/messages/${params.conversationId}`,
  });

  return NextResponse.json(msg);
}

export async function GET(
  req: Request,
  { params }: { params: { conversationId: string } },
) {
  // Fetch all messages in conversation (with auth check)
}
```

### 3. Messages Page: `app/messages/page.tsx`

List all conversations for the current user:

```tsx
// Conversation list sidebar + message thread view
// Similar to any chat interface
```

### 4. Chat UI Component: `components/MessageThread.tsx`

```tsx
"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

export function MessageThread({ conversationId, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Fetch messages
  useEffect(() => {
    /* fetch from API */
  }, [conversationId]);

  // Realtime subscription
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
          setMessages((prev) => [...prev, payload.new]);
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    await fetch(`/api/messages/${conversationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newMessage }),
    });
    setNewMessage("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cx(
              "max-w-[70%] p-3 rounded-2xl text-sm",
              msg.sender_id === currentUserId
                ? "ml-auto bg-brand text-white"
                : "bg-slate-100 text-slate-800",
            )}
          >
            {msg.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4 flex gap-2">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border rounded-xl text-sm"
        />
        <Button onClick={sendMessage} size="sm">
          Send
        </Button>
      </div>
    </div>
  );
}
```

### 5. "Message" Button in Applicant Review

Add a "Message" button per applicant in `ApplicantReviewClient.tsx`:

```tsx
<Button
  size="sm"
  variant="outline"
  onClick={() => router.push(`/messages?application=${applicant.id}`)}
>
  <MessageSquare className="w-4 h-4 mr-1" /> Message
</Button>
```

### 6. Add Messages Nav Item to Sidebar

```tsx
// In sidebar employerItems:
{ label: "Messages", icon: MessageSquare, href: "/messages", badge: unreadMessageCount },

// In sidebar studentItems:
{ label: "Messages", icon: MessageSquare, href: "/messages", badge: unreadMessageCount },
```

## Integration with Other Roles

- **Student**: Can view and reply to messages from employers about their applications
- **Employer**: Can initiate messages to applicants from the review page
- **Admin**: Can view messages if content is flagged (moderation)
- **Notifications**: New messages trigger in-app notifications (task #015)

## Acceptance Criteria

- [ ] Database tables for conversations and messages
- [ ] Employer can start a conversation with an applicant
- [ ] Student can reply to messages
- [ ] Real-time message delivery (Supabase Realtime)
- [ ] Messages page with conversation list + thread view
- [ ] "Message" button in applicant review page
- [ ] Messages nav item in sidebar for both roles
- [ ] Unread message count badge
- [ ] Only participants can access a conversation (RLS enforced)
- [ ] Messages scoped to application context


STATUS: COMPLETE
