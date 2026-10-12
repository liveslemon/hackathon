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

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_employer ON conversations(employer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_student ON conversations(student_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
