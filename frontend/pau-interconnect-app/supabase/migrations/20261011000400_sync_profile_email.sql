-- Keep profiles.email in sync with the login email (2026-10-11)
-- Run in the Supabase SQL editor. Safe to re-run.
--
-- Only 2 of 17 profiles had an email, so application status emails had no
-- address to go to. auth.users is the source of truth.

CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET email = NEW.email WHERE id = NEW.id AND email IS DISTINCT FROM NEW.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_email ON auth.users;
CREATE TRIGGER trg_sync_profile_email
AFTER INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_email();

-- New profiles created after the user exists (onboarding) pick it up too.
CREATE OR REPLACE FUNCTION public.fill_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL THEN
    SELECT u.email INTO NEW.email FROM auth.users u WHERE u.id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_profile_email ON public.profiles;
CREATE TRIGGER trg_fill_profile_email
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.fill_profile_email();

-- Backfill existing rows.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS DISTINCT FROM u.email;

-- ---------------------------------------------------------------------------
-- In-app notification when an employer moves an application to a new stage.
-- Runs as the owner so the employer's session can notify the student.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_student_on_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job record;
  title text;
  body text;
BEGIN
  IF NEW.stage IS NOT DISTINCT FROM OLD.stage
     OR NEW.stage NOT IN ('shortlisted', 'interview', 'offered', 'rejected') THEN
    RETURN NEW;
  END IF;

  SELECT role, company INTO job FROM internships WHERE id = NEW.internship_id;

  title := CASE NEW.stage
    WHEN 'shortlisted' THEN 'You''ve been shortlisted'
    WHEN 'interview'   THEN 'Interview invitation'
    WHEN 'offered'     THEN 'You''ve received an offer'
    WHEN 'rejected'    THEN 'Application update'
  END;
  body := CASE NEW.stage
    WHEN 'shortlisted' THEN coalesce(job.company, 'The employer') || ' shortlisted you for ' || coalesce(job.role, 'an internship') || '.'
    WHEN 'interview'   THEN coalesce(job.company, 'The employer') || ' wants to interview you for ' || coalesce(job.role, 'an internship') || '.'
    WHEN 'offered'     THEN coalesce(job.company, 'The employer') || ' offered you the ' || coalesce(job.role, 'internship') || ' role. Review and accept the offer.'
    WHEN 'rejected'    THEN coalesce(job.company, 'The employer') || ' won''t be moving forward with your application for ' || coalesce(job.role, 'this role') || '.'
  END;

  INSERT INTO notifications (user_id, type, title, body, link, metadata)
  VALUES (
    NEW.user_id, 'application_update', title, body,
    '/internships/' || NEW.internship_id,
    jsonb_build_object('application_id', NEW.id, 'stage', NEW.stage)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_student_on_stage_change ON public.applied_internships;
CREATE TRIGGER trg_notify_student_on_stage_change
AFTER UPDATE OF stage ON public.applied_internships
FOR EACH ROW EXECUTE FUNCTION public.notify_student_on_stage_change();
