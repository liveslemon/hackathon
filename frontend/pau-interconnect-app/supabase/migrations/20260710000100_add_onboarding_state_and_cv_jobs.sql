ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_stage text NOT NULL DEFAULT 'started',
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cv_processing_status text NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS cv_processing_error text;

CREATE TABLE IF NOT EXISTS public.cv_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'onboarding',
  status text NOT NULL DEFAULT 'queued',
  error_message text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cv_processing_jobs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cv_processing_jobs'
      AND policyname = 'cv_jobs_select_own'
  ) THEN
    CREATE POLICY "cv_jobs_select_own"
      ON public.cv_processing_jobs
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cv_processing_jobs'
      AND policyname = 'cv_jobs_insert_own'
  ) THEN
    CREATE POLICY "cv_jobs_insert_own"
      ON public.cv_processing_jobs
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cv_processing_jobs'
      AND policyname = 'cv_jobs_update_own'
  ) THEN
    CREATE POLICY "cv_jobs_update_own"
      ON public.cv_processing_jobs
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_cv_processing_jobs_user_created
  ON public.cv_processing_jobs(user_id, created_at DESC);
