-- Migration: allow inserts when poster_id is an admin profile

-- Drop the old INSERT policy (if present)
DROP POLICY IF EXISTS "internships_insert_authenticated" ON public.internships;

-- Create a new INSERT policy that allows inserts when:
-- 1) the poster_id equals the requesting user (poster_id = auth.uid()), OR
-- 2) the poster_id references a profile whose `is_admin` = true.
-- This lets clients include the admin profile id as poster_id and still pass
-- WITH CHECK even if they are not the admin user.

CREATE POLICY "internships_insert_allow_admin_or_owner"
  ON public.internships
  FOR INSERT
  WITH CHECK (
    -- allow insert when poster_id is the requester OR poster_id references an admin profile
    (poster_id IS NOT NULL AND (poster_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = poster_id AND p.is_admin = true
    )))
  );

-- Note: After running this, inserting with poster_id set to the admin profile id
-- will succeed even if the request is made by a different user or anonymously.
-- If you prefer stricter rules (require the requester to be authenticated
-- or be the admin), adjust the USING/WITH CHECK expressions accordingly.
