-- Migration: add cover_letter column to applied_internships

ALTER TABLE IF EXISTS public.applied_internships
  ADD COLUMN IF NOT EXISTS cover_letter text;
