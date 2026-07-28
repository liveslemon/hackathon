-- Migration: add all profile columns referenced in application code
-- that are missing from the base schema.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role                 text,
  ADD COLUMN IF NOT EXISTS email                text,
  ADD COLUMN IF NOT EXISTS avatar_url           text,
  ADD COLUMN IF NOT EXISTS company_name         text,
  ADD COLUMN IF NOT EXISTS company_description  text,
  ADD COLUMN IF NOT EXISTS company_website      text,
  ADD COLUMN IF NOT EXISTS company_logo_url     text,
  ADD COLUMN IF NOT EXISTS industry             text,
  ADD COLUMN IF NOT EXISTS culture              text,
  ADD COLUMN IF NOT EXISTS cv_text              text;

-- Migration: add employer_id to internships so employer queries work.
-- The original migration used poster_id; employer_id is set by the
-- employer posting flow and queried throughout the employer dashboard.
ALTER TABLE public.internships
  ADD COLUMN IF NOT EXISTS employer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Back-fill employer_id from poster_id for any existing rows.
UPDATE public.internships
SET employer_id = poster_id
WHERE employer_id IS NULL AND poster_id IS NOT NULL;

-- Index for the employer dashboard query pattern (.eq("employer_id", user.id))
CREATE INDEX IF NOT EXISTS idx_internships_employer_id
  ON public.internships(employer_id);
