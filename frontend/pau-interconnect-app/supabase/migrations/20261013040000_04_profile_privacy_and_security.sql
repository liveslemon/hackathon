-- ==============================================================================
-- Migration: 20261013040000_04_profile_privacy_and_security.sql
-- Agent 04: Profile, Privacy, Employer Settings & Scoped Access
-- Idempotent script for Supabase Postgres
-- ==============================================================================

-- 1. Ensure required profile columns exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_website TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_banner_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_description TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS culture TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB
  DEFAULT '{"email_new_applicant": true, "email_logbook_submitted": true, "email_deadline_reminder": true}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS settings JSONB
  DEFAULT '{"notifications": {"application_updates": true, "employer_messages": true}, "privacy": {"phone_visibility": "employers", "email_visibility": "employers"}}'::jsonb;

-- 2. Email synchronization between auth.users and public.profiles
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email
  WHERE id = NEW.id AND email IS DISTINCT FROM NEW.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_email ON auth.users;
CREATE TRIGGER trg_sync_profile_email
AFTER INSERT OR UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_email();

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

-- 3. Scoped Student Profile Reads Helper Functions
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT is_admin IS TRUE OR role = 'admin' FROM public.profiles WHERE id = auth.uid()),
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
    FROM public.applied_internships ai
    JOIN public.internships i ON i.id = ai.internship_id
    WHERE ai.user_id = student
      AND (i.employer_id = auth.uid() OR i.poster_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.logbook_entries l
    WHERE l.student_id = student AND l.employer_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.employer_can_view_student(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.employer_can_view_student(uuid) TO authenticated;

-- 4. Scoped RLS Policy on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_scoped" ON public.profiles;
CREATE POLICY "profiles_read_scoped" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR role = 'employer'
    OR public.is_platform_admin()
    OR (role = 'student' AND public.employer_can_view_student(id))
  );

-- 5. Storage bucket company_assets and policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('company_assets', 'company_assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access for company_assets" ON storage.objects;
CREATE POLICY "Public Access for company_assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'company_assets');

DROP POLICY IF EXISTS "Authenticated users can upload to company_assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload to company_assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company_assets');

DROP POLICY IF EXISTS "Users can update their own uploads in company_assets" ON storage.objects;
CREATE POLICY "Users can update their own uploads in company_assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company_assets' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can delete their own uploads in company_assets" ON storage.objects;
CREATE POLICY "Users can delete their own uploads in company_assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company_assets' AND auth.uid() = owner);
