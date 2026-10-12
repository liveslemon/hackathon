-- 20261013020000_02_ai_cv_improvements.sql
-- Agent 02: AI CV Improvements
-- 1. SKIP LOCKED claiming function for cv_processing_jobs (concurrency safe for multiple workers)
-- 2. Add worker_id and retry_at to cv_processing_jobs
-- 3. Enhance match_internships pgvector RPC to filter active internships and guard against zero vectors

-- Add columns for worker claiming and backoff retry
ALTER TABLE public.cv_processing_jobs
  ADD COLUMN IF NOT EXISTS worker_id text,
  ADD COLUMN IF NOT EXISTS retry_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_cv_processing_jobs_claim
  ON public.cv_processing_jobs (status, retry_at, created_at)
  WHERE status = 'queued';

-- Stored procedure for atomic job claiming with FOR UPDATE SKIP LOCKED
-- Ensures multiple uvicorn workers never claim or process the same job
CREATE OR REPLACE FUNCTION public.claim_next_cv_job(p_worker_id text)
RETURNS SETOF public.cv_processing_jobs
LANGUAGE plpgsql
AS $$
DECLARE
  v_job public.cv_processing_jobs;
BEGIN
  SELECT *
  INTO v_job
  FROM public.cv_processing_jobs
  WHERE status = 'queued'
    AND (retry_at IS NULL OR retry_at <= now())
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF FOUND THEN
    UPDATE public.cv_processing_jobs
    SET status = 'processing',
        worker_id = p_worker_id,
        attempts = COALESCE(attempts, 0) + 1,
        started_at = now(),
        updated_at = now()
    WHERE id = v_job.id;

    v_job.status := 'processing';
    v_job.worker_id := p_worker_id;
    v_job.attempts := COALESCE(v_job.attempts, 0) + 1;
    v_job.started_at := now();
    v_job.updated_at := now();

    RETURN NEXT v_job;
  END IF;
  RETURN;
END;
$$;

-- Ensure pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Updated match_internships vector similarity search
-- Filters active internships and handles cosine similarity
-- Drop first: the existing function returns varchar columns, and Postgres can't
-- change a function's return type with CREATE OR REPLACE.
DROP FUNCTION IF EXISTS public.match_internships(vector, float, int);
CREATE OR REPLACE FUNCTION public.match_internships (
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 30
)
RETURNS TABLE (
  id uuid,
  role text,
  company text,
  description text,
  requirements text,
  category text,
  job_structured jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    internships.id,
    internships.role::text,
    internships.company::text,
    internships.description,
    internships.requirements,
    internships.category::text,
    internships.job_structured,
    (1 - (internships.job_embedding <=> query_embedding))::float AS similarity
  FROM internships
  WHERE internships.job_embedding IS NOT NULL
    AND internships.status = 'active'
    AND query_embedding IS NOT NULL
    AND (1 - (internships.job_embedding <=> query_embedding)) > match_threshold
  ORDER BY internships.job_embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;
