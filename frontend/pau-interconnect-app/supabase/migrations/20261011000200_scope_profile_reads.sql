-- Scope who can read student profiles (2026-10-11)
-- Run in the Supabase SQL editor. Safe to re-run.
--
-- Before: "All authenticated users can read all profiles" (USING true) let any
-- logged-in user read every student's CV text, phone number and CV link.
-- After, a student profile is readable by:
--   * the student,
--   * employers the student applied to, or who supervise their logbook,
--   * platform admins.
-- Employer (company) profiles stay readable by any logged-in user.

-- Helpers run as the owner so they can look across tables without recursing
-- into profiles' own RLS.
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

CREATE OR REPLACE FUNCTION public.employer_can_view_student(student uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM applied_internships ai
    JOIN internships i ON i.id = ai.internship_id
    WHERE ai.user_id = student
      AND (i.employer_id = auth.uid() OR i.poster_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM logbook_entries l
    WHERE l.student_id = student AND l.employer_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.employer_can_view_student(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.employer_can_view_student(uuid) TO authenticated;

-- Drop every existing SELECT policy on profiles (names differ between the
-- migrations that were applied), then add the single scoped one.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.profiles', pol.policyname);
  END LOOP;
END;
$$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_read_scoped" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR role = 'employer'
    OR public.is_platform_admin()
    OR (role = 'student' AND public.employer_can_view_student(id))
  );
