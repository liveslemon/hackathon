-- Protect SIWES logbook reviews (2026-10-11)
-- Run in the Supabase SQL editor. Safe to re-run.
--
-- The student UPDATE policy has no WITH CHECK and INSERT doesn't restrict
-- status, so a student could approve their own entries straight from the
-- browser. This trigger enforces who may change what:
--   * students: write their own activities; every save goes back to
--     "pending"; they can't set review fields.
--   * the supervising employer: only status / feedback / review fields,
--     never the student's text or date.
--   * service role / SQL editor: unrestricted.

-- SECURITY INVOKER: current_user must be the caller's role.
CREATE OR REPLACE FUNCTION public.protect_logbook_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF uid IS NOT NULL AND uid = NEW.student_id THEN
    IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
      RAISE EXCEPTION 'Approved logbook entries are locked' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.employer_id IS DISTINCT FROM OLD.employer_id THEN
      RAISE EXCEPTION 'Not allowed to change the supervisor' USING ERRCODE = '42501';
    END IF;
    NEW.status := 'pending';
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    IF TG_OP = 'INSERT' THEN
      NEW.feedback_notes := NULL;
    ELSE
      NEW.feedback_notes := OLD.feedback_notes;  -- keep the supervisor's last comment
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND uid IS NOT NULL AND uid = OLD.employer_id THEN
    IF NEW.activities_raw IS DISTINCT FROM OLD.activities_raw
       OR NEW.activities_enhanced IS DISTINCT FROM OLD.activities_enhanced
       OR NEW.date IS DISTINCT FROM OLD.date
       OR NEW.student_id IS DISTINCT FROM OLD.student_id
       OR NEW.employer_id IS DISTINCT FROM OLD.employer_id THEN
      RAISE EXCEPTION 'Supervisors can only review entries' USING ERRCODE = '42501';
    END IF;
    IF NEW.status NOT IN ('pending', 'approved', 'flagged') THEN
      RAISE EXCEPTION 'Invalid status %', NEW.status USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not allowed to modify this logbook entry' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_logbook_review ON public.logbook_entries;
CREATE TRIGGER trg_protect_logbook_review
BEFORE INSERT OR UPDATE ON public.logbook_entries
FOR EACH ROW EXECUTE FUNCTION public.protect_logbook_review();
