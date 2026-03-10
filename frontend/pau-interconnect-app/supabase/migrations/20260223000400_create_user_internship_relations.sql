-- Migration: create saved_internships, applied_internships, liked_internships

CREATE TABLE IF NOT EXISTS public.saved_internships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  internship_id uuid NOT NULL REFERENCES public.internships(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, internship_id)
);

CREATE TABLE IF NOT EXISTS public.applied_internships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  internship_id uuid NOT NULL REFERENCES public.internships(id) ON DELETE CASCADE,
  resume_link text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, internship_id)
);

CREATE TABLE IF NOT EXISTS public.liked_internships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  internship_id uuid NOT NULL REFERENCES public.internships(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, internship_id)
);

-- Enable RLS and policies: authenticated users can select, insert their own rows, delete their own rows
ALTER TABLE public.saved_internships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_select_authenticated" ON public.saved_internships FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "saved_insert_own" ON public.saved_internships FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "saved_delete_own" ON public.saved_internships FOR DELETE USING (user_id = auth.uid());

ALTER TABLE public.applied_internships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "applied_select_authenticated" ON public.applied_internships FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "applied_insert_own" ON public.applied_internships FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "applied_delete_own" ON public.applied_internships FOR DELETE USING (user_id = auth.uid());

ALTER TABLE public.liked_internships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "liked_select_authenticated" ON public.liked_internships FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "liked_insert_own" ON public.liked_internships FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "liked_delete_own" ON public.liked_internships FOR DELETE USING (user_id = auth.uid());
