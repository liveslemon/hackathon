-- Migration: 20261013060000_06_employer_rls_and_messaging_audit.sql
-- Agent 06: Lock down employer RLS policies for conversations, messages, decision audit log, and templates.

-- 1. Ensure required columns on internships table
ALTER TABLE public.internships ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.internships ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE public.internships ADD COLUMN IF NOT EXISTS stipend TEXT;
ALTER TABLE public.internships ADD COLUMN IF NOT EXISTS required_skills TEXT[];
ALTER TABLE public.internships ADD COLUMN IF NOT EXISTS slots INTEGER DEFAULT 1;
ALTER TABLE public.internships ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.internships ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- 2. Ensure required columns on applied_internships table
ALTER TABLE public.applied_internships ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'applied';
ALTER TABLE public.applied_internships ADD COLUMN IF NOT EXISTS decision_notes TEXT;
ALTER TABLE public.applied_internships ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE public.applied_internships ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
ALTER TABLE public.applied_internships ADD COLUMN IF NOT EXISTS decided_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.applied_internships ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 3. Enable RLS on conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;
CREATE POLICY "conversations_select_participant"
ON public.conversations FOR SELECT
TO authenticated
USING (
  employer_id = auth.uid() OR student_id = auth.uid()
);

DROP POLICY IF EXISTS "conversations_insert_participant" ON public.conversations;
CREATE POLICY "conversations_insert_participant"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (
  employer_id = auth.uid() OR student_id = auth.uid()
);

-- 4. Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;
CREATE POLICY "messages_select_participant"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.employer_id = auth.uid() OR c.student_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "messages_insert_sender" ON public.messages;
CREATE POLICY "messages_insert_sender"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.employer_id = auth.uid() OR c.student_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "messages_update_recipient" ON public.messages;
CREATE POLICY "messages_update_recipient"
ON public.messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.employer_id = auth.uid() OR c.student_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
      AND (c.employer_id = auth.uid() OR c.student_id = auth.uid())
  )
);

-- 5. Enable RLS on internship_templates
ALTER TABLE public.internship_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "templates_select_owner" ON public.internship_templates;
CREATE POLICY "templates_select_owner"
ON public.internship_templates FOR SELECT
TO authenticated
USING (employer_id = auth.uid());

DROP POLICY IF EXISTS "templates_insert_owner" ON public.internship_templates;
CREATE POLICY "templates_insert_owner"
ON public.internship_templates FOR INSERT
TO authenticated
WITH CHECK (employer_id = auth.uid());

DROP POLICY IF EXISTS "templates_update_owner" ON public.internship_templates;
CREATE POLICY "templates_update_owner"
ON public.internship_templates FOR UPDATE
TO authenticated
USING (employer_id = auth.uid())
WITH CHECK (employer_id = auth.uid());

DROP POLICY IF EXISTS "templates_delete_owner" ON public.internship_templates;
CREATE POLICY "templates_delete_owner"
ON public.internship_templates FOR DELETE
TO authenticated
USING (employer_id = auth.uid());

-- 6. Enable RLS on decision_audit_log
ALTER TABLE public.decision_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select_authorized" ON public.decision_audit_log;
CREATE POLICY "audit_select_authorized"
ON public.decision_audit_log FOR SELECT
TO authenticated
USING (
  actor_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND (p.is_admin = true OR p.role = 'admin')
  )
  OR (
    target_type = 'application' AND EXISTS (
      SELECT 1 FROM public.applied_internships ai
      JOIN public.internships i ON i.id = ai.internship_id
      WHERE ai.id = decision_audit_log.target_id
        AND (i.employer_id = auth.uid() OR ai.user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "audit_insert_actor" ON public.decision_audit_log;
CREATE POLICY "audit_insert_actor"
ON public.decision_audit_log FOR INSERT
TO authenticated
WITH CHECK (actor_id = auth.uid());
