-- Student-side security and logbook fixes (2026-10-11)
-- Run in the Supabase SQL editor. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Stop users granting themselves admin.
--    "profiles_update_own" lets a user update every column of their own row,
--    and the backend trusts profiles.is_admin / role = 'admin'. Only the
--    service role (backend, SQL editor) may change is_admin or an existing
--    role. Users may still pick student/employer once during onboarding.
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER on purpose: current_user must be the caller's role
-- (authenticated / service_role / postgres), not the function owner.
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF coalesce(NEW.is_admin, false) THEN
      RAISE EXCEPTION 'Not allowed to set is_admin' USING ERRCODE = '42501';
    END IF;
    IF NEW.role IS NOT NULL AND NEW.role NOT IN ('student', 'employer') THEN
      RAISE EXCEPTION 'Not allowed to set role %', NEW.role USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Not allowed to change is_admin' USING ERRCODE = '42501';
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF OLD.role IS NOT NULL OR NEW.role NOT IN ('student', 'employer') THEN
      RAISE EXCEPTION 'Not allowed to change role' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileges ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileges
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

-- ---------------------------------------------------------------------------
-- 2. Notifications had RLS disabled: anyone holding the public anon key
--    (shipped in the website bundle) could read every user's notifications.
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Messaging routes notify the other participant using the sender's session.
-- Allow only that notification type, with an in-app link, to limit spoofing.
DROP POLICY IF EXISTS "notifications_insert_messages" ON public.notifications;
CREATE POLICY "notifications_insert_messages" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (type = 'new_message' AND (link IS NULL OR link LIKE '/%'));

-- The new-application trigger fires as the applying student; run it with the
-- owner's rights so it can still insert the employer's notification.
CREATE OR REPLACE FUNCTION public.notify_employer_on_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, link, metadata)
  SELECT
    i.employer_id,
    'new_application',
    'New Application Received',
    (SELECT full_name FROM profiles WHERE id = NEW.user_id) || ' applied for ' || i.role,
    '/dashboard/employer/internships/' || NEW.internship_id,
    jsonb_build_object('application_id', NEW.id, 'internship_id', NEW.internship_id)
  FROM internships i WHERE i.id = NEW.internship_id;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Logbook supervisor feedback: the app writes and reads feedback_notes but
--    the column was never created, so flagging an entry with feedback failed.
-- ---------------------------------------------------------------------------
ALTER TABLE public.logbook_entries ADD COLUMN IF NOT EXISTS feedback_notes text;

-- ---------------------------------------------------------------------------
-- 4. Cache skill-gap results so repeat views are instant and consistent.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.skill_gap_analyses (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  internship_id uuid NOT NULL REFERENCES public.internships(id) ON DELETE CASCADE,
  cv_hash text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, internship_id)
);

ALTER TABLE public.skill_gap_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skill_gap_select_own" ON public.skill_gap_analyses;
CREATE POLICY "skill_gap_select_own" ON public.skill_gap_analyses
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
