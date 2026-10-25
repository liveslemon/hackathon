-- ==============================================================================
-- 20261014110000_11_matching_redesign.sql
-- Agent 11: Matching Pipeline Redesign & Canonical Consistency
-- ==============================================================================

-- 1. Extend match_results with versioning, hash tracking, and two-layer reasoning
ALTER TABLE public.match_results
  ADD COLUMN IF NOT EXISTS score_version integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS inputs_hash text,
  ADD COLUMN IF NOT EXISTS last_computed_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS instant_reasoning text,
  ADD COLUMN IF NOT EXISTS ai_reasoning text,
  ADD COLUMN IF NOT EXISTS ai_reasoning_hash text,
  ADD COLUMN IF NOT EXISTS ai_reasoning_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_match_results_inputs_hash
  ON public.match_results (user_id, inputs_hash);

CREATE INDEX IF NOT EXISTS idx_match_results_score_version
  ON public.match_results (score_version);

-- 2. Extend cv_processing_jobs to handle internship rescoring, match reasoning, and deduplication
ALTER TABLE public.cv_processing_jobs
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.cv_processing_jobs
  ADD COLUMN IF NOT EXISTS internship_id uuid REFERENCES public.internships(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 0;

-- Partial unique indexes for deduplication (at most one queued job per subject, kind)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cv_processing_jobs_user_kind_queued
  ON public.cv_processing_jobs (user_id, kind)
  WHERE status = 'queued' AND user_id IS NOT NULL AND internship_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cv_processing_jobs_internship_kind_queued
  ON public.cv_processing_jobs (internship_id, kind)
  WHERE status = 'queued' AND internship_id IS NOT NULL AND user_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cv_processing_jobs_match_reasoning_queued
  ON public.cv_processing_jobs (user_id, internship_id, kind)
  WHERE status = 'queued' AND user_id IS NOT NULL AND internship_id IS NOT NULL;

-- 3. Stored procedure for atomic job claiming ordered by priority DESC, created_at ASC
DROP FUNCTION IF EXISTS public.claim_next_cv_job(text);
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
  ORDER BY priority DESC, created_at ASC
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

-- 4. Vector matching RPC: Student vs ALL OPEN internships (cosine computed in Postgres)
-- Matches every open internship (status = 'active', deadline not passed)
DROP FUNCTION IF EXISTS public.match_all_open_internships_for_student(uuid, vector, float, int);
CREATE OR REPLACE FUNCTION public.match_all_open_internships_for_student (
  p_student_id uuid,
  p_query_embedding vector(1024),
  p_match_threshold float DEFAULT 0.0,
  p_limit int DEFAULT 1000
)
RETURNS TABLE (
  id uuid,
  role text,
  company text,
  description text,
  requirements text,
  required_skills text[],
  category text,
  field text,
  location text,
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
    internships.required_skills,
    internships.category::text,
    internships.field::text,
    internships.location::text,
    internships.job_structured,
    CASE
      WHEN internships.job_embedding IS NOT NULL AND p_query_embedding IS NOT NULL THEN
        (1 - (internships.job_embedding <=> p_query_embedding))::float
      ELSE 0.0::float
    END AS similarity
  FROM internships
  WHERE internships.status = 'active'
    AND (internships.deadline IS NULL OR internships.deadline >= now())
    AND (
      p_query_embedding IS NULL
      OR internships.job_embedding IS NULL
      OR (1 - (internships.job_embedding <=> p_query_embedding)) >= p_match_threshold
    )
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$;

-- 5. Vector matching RPC: Internship vs ALL students with embedding or profile data
DROP FUNCTION IF EXISTS public.match_all_students_for_internship(uuid, vector, float, int);
CREATE OR REPLACE FUNCTION public.match_all_students_for_internship (
  p_internship_id uuid,
  p_query_embedding vector(1024),
  p_match_threshold float DEFAULT 0.0,
  p_limit int DEFAULT 5000
)
RETURNS TABLE (
  id uuid,
  skills jsonb,
  cv_text text,
  cv_structured jsonb,
  course text,
  experience jsonb,
  projects jsonb,
  interests text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    profiles.id,
    profiles.skills,
    profiles.cv_text,
    profiles.cv_structured,
    profiles.course::text,
    profiles.experience,
    profiles.projects,
    profiles.interests,
    CASE
      WHEN profiles.cv_embedding IS NOT NULL AND p_query_embedding IS NOT NULL THEN
        (1 - (profiles.cv_embedding <=> p_query_embedding))::float
      ELSE 0.0::float
    END AS similarity
  FROM profiles
  WHERE profiles.role = 'student'
    AND (
      profiles.cv_text IS NOT NULL
      OR (jsonb_typeof(profiles.skills) = 'array' AND jsonb_array_length(profiles.skills) > 0)
    )
    AND (
      p_query_embedding IS NULL
      OR profiles.cv_embedding IS NULL
      OR (1 - (profiles.cv_embedding <=> p_query_embedding)) >= p_match_threshold
    )
  ORDER BY similarity DESC
  LIMIT p_limit;
END;
$$;

-- 6. Helper to clean up match rows for closed/expired/deleted internships
CREATE OR REPLACE FUNCTION public.cleanup_stale_match_results()
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  v_deleted int;
BEGIN
  DELETE FROM public.match_results
  WHERE internship_id IN (
    SELECT id FROM public.internships
    WHERE status IN ('closed', 'deleted', 'draft')
       OR (deadline IS NOT NULL AND deadline < now())
  );
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- 7. These functions are for the backend (service role) only. Functions in public are executable by
--    anon/authenticated through PostgREST by default; match_all_students_for_internship returns CV text and
--    claim_next_cv_job would let any user grab queue jobs.
REVOKE ALL ON FUNCTION public.claim_next_cv_job(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_all_open_internships_for_student(uuid, vector, float, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_all_students_for_internship(uuid, vector, float, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cleanup_stale_match_results() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_next_cv_job(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_all_open_internships_for_student(uuid, vector, float, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.match_all_students_for_internship(uuid, vector, float, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_match_results() TO service_role;
