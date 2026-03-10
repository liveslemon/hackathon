-- Migration: add is_admin boolean to profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Example: set a specific profile as admin by email (run in SQL editor)
-- Replace 'admin@example.com' with the admin auth email you want to mark:
-- UPDATE public.profiles p
-- SET is_admin = true
-- FROM auth.users u
-- WHERE p.id = u.id AND u.email = 'admin@example.com';

-- Alternatively, set by profile id:
-- UPDATE public.profiles SET is_admin = true WHERE id = '<PROFILE_UUID>';
