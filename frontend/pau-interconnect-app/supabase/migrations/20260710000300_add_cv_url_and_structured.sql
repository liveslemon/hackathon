-- Migration: add cv_url and cv_structured columns to profiles
-- Required by the backend's save_cv_text_and_url function.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cv_url         text,
  ADD COLUMN IF NOT EXISTS cv_structured  jsonb;
