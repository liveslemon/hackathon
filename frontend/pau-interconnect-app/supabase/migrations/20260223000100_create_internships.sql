-- Supabase migration: create `internships` table and RLS policies

-- Ensure pgcrypto is enabled for UUID helpers
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.internships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  company text NOT NULL,
  role text NOT NULL,
  field text,
  category text,
  description text,
  requirements text,
  interests text[],
  recruiter_link text,
  deadline timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read internships
CREATE POLICY "internships_select_authenticated"
  ON public.internships
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert internships where poster_id equals their auth.uid()
CREATE POLICY "internships_insert_authenticated"
  ON public.internships
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND poster_id = auth.uid());

-- Allow admins (via custom JWT claim is_admin) to insert/update/delete
-- (Optional) Admin-only management
-- If you want an "admin" role, prefer storing an `is_admin` boolean on
-- `public.profiles` and reference it in policies. Example (requires adding
-- an `is_admin boolean DEFAULT false` column to `profiles`):
--
-- CREATE POLICY "internships_manage_admins"
--   ON public.internships
--   FOR ALL
--   USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin))
--   WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_admin));

-- Allow the row poster to update their own internships
CREATE POLICY "internships_modify_owner_update"
  ON public.internships
  FOR UPDATE
  USING (auth.uid() = poster_id)
  WITH CHECK (auth.uid() = poster_id);

-- Allow the row poster to delete their own internships
CREATE POLICY "internships_modify_owner_delete"
  ON public.internships
  FOR DELETE
  USING (auth.uid() = poster_id);

-- Note: In many setups you may prefer to insert internships via an admin
-- interface or Edge Function using the `service_role` key. The above policies
-- allow any authenticated user to SELECT and only admins or the poster to
-- modify rows.
