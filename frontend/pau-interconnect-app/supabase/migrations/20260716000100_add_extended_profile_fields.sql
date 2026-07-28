-- Migration: add extended profile fields for student profiles
-- These store rich profile data (experience, projects, etc.) as JSONB

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone                text,
  ADD COLUMN IF NOT EXISTS bio                  text,
  ADD COLUMN IF NOT EXISTS expected_graduation  text,
  ADD COLUMN IF NOT EXISTS cgpa                 text,
  ADD COLUMN IF NOT EXISTS skills               jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS languages            jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS experience           jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS projects             jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS certifications       jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_work_type  text,
  ADD COLUMN IF NOT EXISTS employment_type      text,
  ADD COLUMN IF NOT EXISTS availability         text,
  ADD COLUMN IF NOT EXISTS preferred_locations  text[],
  ADD COLUMN IF NOT EXISTS portfolio_links      jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS settings             jsonb DEFAULT '{}'::jsonb;
