-- Migration: 20261013030000_03_discovery_apply_optimizations.sql
-- Agent: 03 (Discovery & Apply)
-- Purpose: 
-- 1. Optimize internship discovery queries and pipeline tracking with compound indexes.
-- 2. Restrict internship reads so students cannot view draft listings.

-- 1. Compound indexes for fast discovery and status lookups
CREATE INDEX IF NOT EXISTS idx_internships_status_deadline 
  ON public.internships(status, deadline);

CREATE INDEX IF NOT EXISTS idx_internships_employer_id 
  ON public.internships(employer_id);

CREATE INDEX IF NOT EXISTS idx_internships_poster_id 
  ON public.internships(poster_id);

CREATE INDEX IF NOT EXISTS idx_applied_internships_user_stage 
  ON public.applied_internships(user_id, stage);

CREATE INDEX IF NOT EXISTS idx_applied_internships_internship_stage 
  ON public.applied_internships(internship_id, stage);

-- 2. Scope internship SELECT to prevent non-owners from seeing draft listings
DROP POLICY IF EXISTS "internships_select_authenticated" ON public.internships;

CREATE POLICY "internships_select_authenticated"
  ON public.internships
  FOR SELECT
  TO authenticated
  USING (
    -- Admin or service role can read all
    coalesce((auth.jwt()->>'role')::text, '') = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() AND (p.is_admin = true OR p.role = 'admin')
    )
    -- Owners/posters can see their own drafts
    OR poster_id = auth.uid()
    OR employer_id = auth.uid()
    -- Students and general users can only see non-draft internships
    OR coalesce(status, 'active') != 'draft'
  );
