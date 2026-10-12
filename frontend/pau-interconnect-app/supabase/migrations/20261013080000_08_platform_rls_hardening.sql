-- ==============================================================================
-- 20261013080000_08_platform_rls_hardening.sql
-- Migration Author: Agent 08 (Platform & Database Foundation)
-- Description:
--   1. Ensures match_results table exists with strict schema and RLS.
--   2. Enables Row Level Security (RLS) on all previously unprotected tables:
--      - conversations
--      - messages
--      - application_stage_history
--      - decision_audit_log
--      - internship_templates
--      - company_followers
--      - match_results
--   3. Restricts overly broad SELECT policies on sensitive student tables:
--      - saved_internships (replaces public SELECT with owner-only/admin)
--      - liked_internships (replaces public SELECT with owner-only/admin)
--      - internships (hides draft/deleted postings from non-owner students)
--   4. Creates high-performance composite and foreign key indexes across all tables.
-- Idempotent: safe to run multiple times.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Helper: Platform Admin check (SECURITY DEFINER to prevent recursion)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT is_admin IS TRUE OR role = 'admin' FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- Helper: Check if current caller is the employer/poster of an internship
CREATE OR REPLACE FUNCTION public.is_internship_employer(internship uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM internships i
    WHERE i.id = internship AND (i.employer_id = auth.uid() OR i.poster_id = auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.is_internship_employer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_internship_employer(uuid) TO authenticated;


-- ------------------------------------------------------------------------------
-- 1. match_results Table Definition & RLS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_results (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    internship_id UUID NOT NULL REFERENCES public.internships(id) ON DELETE CASCADE,
    match_score INT NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    matching_skills JSONB DEFAULT '[]'::jsonb,
    missing_skills JSONB DEFAULT '[]'::jsonb,
    reasoning TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, internship_id)
);

ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_results_select_scoped" ON public.match_results;
CREATE POLICY "match_results_select_scoped" ON public.match_results
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR public.is_internship_employer(internship_id)
        OR public.is_platform_admin()
    );

DROP POLICY IF EXISTS "match_results_modify_admin_service" ON public.match_results;
CREATE POLICY "match_results_modify_admin_service" ON public.match_results
    FOR ALL TO authenticated
    USING (public.is_platform_admin())
    WITH CHECK (public.is_platform_admin());


-- ------------------------------------------------------------------------------
-- 2. saved_internships & liked_internships: Restrict from Public to Owner-Only
-- ------------------------------------------------------------------------------
ALTER TABLE public.saved_internships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_select_authenticated" ON public.saved_internships;
DROP POLICY IF EXISTS "saved_select_own" ON public.saved_internships;
CREATE POLICY "saved_select_own" ON public.saved_internships
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_platform_admin());

ALTER TABLE public.liked_internships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "liked_select_authenticated" ON public.liked_internships;
DROP POLICY IF EXISTS "liked_select_own" ON public.liked_internships;
CREATE POLICY "liked_select_own" ON public.liked_internships
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_platform_admin());


-- ------------------------------------------------------------------------------
-- 3. internships: Prevent Leaking Draft and Deleted Postings to Students
-- ------------------------------------------------------------------------------
ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "internships_select_authenticated" ON public.internships;
DROP POLICY IF EXISTS "internships_select_active" ON public.internships;
CREATE POLICY "internships_select_active" ON public.internships
    FOR SELECT TO authenticated
    USING (
        coalesce(status, 'active') NOT IN ('draft', 'deleted')
        OR poster_id = auth.uid()
        OR employer_id = auth.uid()
        OR public.is_platform_admin()
    );


-- ------------------------------------------------------------------------------
-- 4. conversations & messages: Enable RLS and Restrict to Participants
-- ------------------------------------------------------------------------------
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;
CREATE POLICY "conversations_select_participant" ON public.conversations
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR employer_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS "conversations_insert_participant" ON public.conversations;
CREATE POLICY "conversations_insert_participant" ON public.conversations
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid() OR employer_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS "conversations_update_participant" ON public.conversations;
CREATE POLICY "conversations_update_participant" ON public.conversations
    FOR UPDATE TO authenticated
    USING (student_id = auth.uid() OR employer_id = auth.uid() OR public.is_platform_admin())
    WITH CHECK (student_id = auth.uid() OR employer_id = auth.uid() OR public.is_platform_admin());

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_select_participant" ON public.messages;
CREATE POLICY "messages_select_participant" ON public.messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND (c.student_id = auth.uid() OR c.employer_id = auth.uid())
        ) OR public.is_platform_admin()
    );

DROP POLICY IF EXISTS "messages_insert_sender" ON public.messages;
CREATE POLICY "messages_insert_sender" ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (
        sender_id = auth.uid() AND (
            EXISTS (
                SELECT 1 FROM public.conversations c
                WHERE c.id = messages.conversation_id
                  AND (c.student_id = auth.uid() OR c.employer_id = auth.uid())
            ) OR public.is_platform_admin()
        )
    );

DROP POLICY IF EXISTS "messages_update_participant" ON public.messages;
CREATE POLICY "messages_update_participant" ON public.messages
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
              AND (c.student_id = auth.uid() OR c.employer_id = auth.uid())
        ) OR public.is_platform_admin()
    );


-- ------------------------------------------------------------------------------
-- 5. application_stage_history & decision_audit_log: Enable RLS & Restrict
-- ------------------------------------------------------------------------------
ALTER TABLE public.application_stage_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stage_history_select_scoped" ON public.application_stage_history;
CREATE POLICY "stage_history_select_scoped" ON public.application_stage_history
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.applied_internships ai
            WHERE ai.id = application_stage_history.application_id
              AND (ai.user_id = auth.uid() OR public.is_internship_employer(ai.internship_id))
        ) OR public.is_platform_admin()
    );

DROP POLICY IF EXISTS "stage_history_insert_scoped" ON public.application_stage_history;
CREATE POLICY "stage_history_insert_scoped" ON public.application_stage_history
    FOR INSERT TO authenticated
    WITH CHECK (
        changed_by = auth.uid()
        OR public.is_platform_admin()
    );

ALTER TABLE public.decision_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select_scoped" ON public.decision_audit_log;
CREATE POLICY "audit_log_select_scoped" ON public.decision_audit_log
    FOR SELECT TO authenticated
    USING (
        actor_id = auth.uid()
        OR public.is_platform_admin()
    );

DROP POLICY IF EXISTS "audit_log_insert_scoped" ON public.decision_audit_log;
CREATE POLICY "audit_log_insert_scoped" ON public.decision_audit_log
    FOR INSERT TO authenticated
    WITH CHECK (
        actor_id = auth.uid()
        OR public.is_platform_admin()
    );


-- ------------------------------------------------------------------------------
-- 6. internship_templates & company_followers: Enable RLS & Restrict
-- ------------------------------------------------------------------------------
ALTER TABLE public.internship_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "templates_select_own" ON public.internship_templates;
CREATE POLICY "templates_select_own" ON public.internship_templates
    FOR SELECT TO authenticated
    USING (employer_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS "templates_insert_own" ON public.internship_templates;
CREATE POLICY "templates_insert_own" ON public.internship_templates
    FOR INSERT TO authenticated
    WITH CHECK (employer_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS "templates_update_own" ON public.internship_templates;
CREATE POLICY "templates_update_own" ON public.internship_templates
    FOR UPDATE TO authenticated
    USING (employer_id = auth.uid() OR public.is_platform_admin())
    WITH CHECK (employer_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS "templates_delete_own" ON public.internship_templates;
CREATE POLICY "templates_delete_own" ON public.internship_templates
    FOR DELETE TO authenticated
    USING (employer_id = auth.uid() OR public.is_platform_admin());

ALTER TABLE public.company_followers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "followers_select_scoped" ON public.company_followers;
CREATE POLICY "followers_select_scoped" ON public.company_followers
    FOR SELECT TO authenticated
    USING (student_id = auth.uid() OR company_id = auth.uid() OR public.is_platform_admin());

DROP POLICY IF EXISTS "followers_insert_own" ON public.company_followers;
CREATE POLICY "followers_insert_own" ON public.company_followers
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "followers_delete_own" ON public.company_followers;
CREATE POLICY "followers_delete_own" ON public.company_followers
    FOR DELETE TO authenticated
    USING (student_id = auth.uid());


-- ------------------------------------------------------------------------------
-- 7. High-Performance Indexes for Foreign Keys & Hot Query Columns
-- ------------------------------------------------------------------------------
-- internships
CREATE INDEX IF NOT EXISTS idx_internships_poster_id ON public.internships(poster_id);
CREATE INDEX IF NOT EXISTS idx_internships_status ON public.internships(status);
CREATE INDEX IF NOT EXISTS idx_internships_category ON public.internships(category);
CREATE INDEX IF NOT EXISTS idx_internships_deadline ON public.internships(deadline);

-- applied_internships
CREATE INDEX IF NOT EXISTS idx_applied_internships_user_id ON public.applied_internships(user_id);
CREATE INDEX IF NOT EXISTS idx_applied_internships_internship_id ON public.applied_internships(internship_id);
CREATE INDEX IF NOT EXISTS idx_applied_internships_stage ON public.applied_internships(stage);
CREATE INDEX IF NOT EXISTS idx_applied_internships_status ON public.applied_internships(status);
CREATE INDEX IF NOT EXISTS idx_applied_internships_placement_status ON public.applied_internships(placement_status);

-- saved_internships & liked_internships
CREATE INDEX IF NOT EXISTS idx_saved_internships_user_id ON public.saved_internships(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_internships_internship_id ON public.saved_internships(internship_id);
CREATE INDEX IF NOT EXISTS idx_liked_internships_user_id ON public.liked_internships(user_id);
CREATE INDEX IF NOT EXISTS idx_liked_internships_internship_id ON public.liked_internships(internship_id);

-- match_results
CREATE INDEX IF NOT EXISTS idx_match_results_user_score ON public.match_results(user_id, match_score DESC);
CREATE INDEX IF NOT EXISTS idx_match_results_internship ON public.match_results(internship_id);
CREATE INDEX IF NOT EXISTS idx_match_results_updated ON public.match_results(updated_at DESC);

-- logbook_entries
CREATE INDEX IF NOT EXISTS idx_logbook_entries_student_date ON public.logbook_entries(student_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_logbook_entries_employer ON public.logbook_entries(employer_id);
CREATE INDEX IF NOT EXISTS idx_logbook_entries_status ON public.logbook_entries(status);

-- messaging
CREATE INDEX IF NOT EXISTS idx_conversations_app ON public.conversations(application_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin) WHERE is_admin IS TRUE;

-- skill_gap_analyses
CREATE INDEX IF NOT EXISTS idx_skill_gap_internship ON public.skill_gap_analyses(internship_id);
