-- Migration: create `profiles` table and RLS policies
-- Ensure pgcrypto is enabled for UUID helpers
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Run this in Supabase SQL editor or via the Supabase CLI migration system.

-- Table: public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  course text,
  level text,
  interests text[],
  cv_url text,
  cv_analysis text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ensure row level security is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to SELECT their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to INSERT their own profile (check that the new row's id matches their uid)
CREATE POLICY "profiles_insert_own"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to UPDATE their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Optional: allow the Supabase service role to bypass RLS (already allowed by Supabase
-- when using the service_role key). If you want admins to read all profiles via a
-- Postgres role or JWT claim, create an additional policy. Example to allow reads
-- for users with a custom "is_admin" claim (if you add it to JWT):
--
-- CREATE POLICY "profiles_select_admins"
--   ON public.profiles
--   FOR SELECT
--   USING (auth.claims() ->> 'is_admin' = 'true');

-- Note on signup flow:
-- Many client-side signup flows call `auth.signUp()` then immediately insert into
-- `profiles`. If your project requires email confirmation (no active session after
-- signUp), the insert will fail because `auth.uid()` will be null. Two remedies:
-- 1) Insert the profile server-side (Edge Function) using the `service_role` key.
-- 2) Wait until the user confirms and signs in, then insert (client-side).
