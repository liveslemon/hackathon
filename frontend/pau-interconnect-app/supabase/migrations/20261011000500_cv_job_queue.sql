-- Turn cv_processing_jobs into a durable work queue (2026-10-11)
-- Run in the Supabase SQL editor BEFORE deploying the backend that uses it.
-- Safe to re-run.
--
-- CV analysis used to run as an in-process FastAPI background task and was
-- lost whenever Render restarted. The backend now enqueues a row here and a
-- worker loop claims and runs it, retrying jobs interrupted by a restart.

ALTER TABLE public.cv_processing_jobs
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'cv_analysis',
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_cv_processing_jobs_queue
  ON public.cv_processing_jobs (status, created_at);

-- Only the backend (service role) creates or changes jobs. Students could
-- otherwise insert or re-queue jobs and run unlimited AI analyses.
DROP POLICY IF EXISTS "cv_jobs_insert_own" ON public.cv_processing_jobs;
DROP POLICY IF EXISTS "cv_jobs_update_own" ON public.cv_processing_jobs;

-- Don't let the new worker resurrect stale jobs from the old system.
UPDATE public.cv_processing_jobs
SET status = 'failed', error_message = 'Superseded by job queue', updated_at = now()
WHERE status IN ('queued', 'processing') AND created_at < now() - interval '1 hour';
