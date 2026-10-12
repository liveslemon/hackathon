-- Fix for "Unknown Student" issue on employer dashboards and "Unknown Company" on student views.
-- Supabase Row Level Security (RLS) blocks users from reading other users' profile data by default.
-- We must allow authenticated users (like employers) to SELECT from the profiles table.

DROP POLICY IF EXISTS "All authenticated users can read all profiles" ON profiles;

CREATE POLICY "All authenticated users can read all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);
