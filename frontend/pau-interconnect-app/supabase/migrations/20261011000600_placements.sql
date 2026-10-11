-- Internship placements: one active placement per student, logbook tied to it
-- (2026-10-11). Run in the Supabase SQL editor BEFORE deploying the app
-- changes that use it. Safe to re-run.
--
-- * An accepted application is a "placement" (active -> completed).
-- * A student can have only ONE active placement. Accepting a new offer is
--   refused while one is active; accepting withdraws their other open offers.
-- * Every logbook entry belongs to a placement (application_id). The
--   supervisor (employer_id) is derived from it, not trusted from the client.
-- * Applications: students could edit any column of their own application
--   (e.g. mark themselves accepted) and any logged-in user could read every
--   application. Both are locked down here.

-- ---------------------------------------------------------------------------
-- 1. Placement columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.applied_internships
  ADD COLUMN IF NOT EXISTS placement_status text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'applied_internships_placement_status_check'
  ) THEN
    ALTER TABLE public.applied_internships
      ADD CONSTRAINT applied_internships_placement_status_check
      CHECK (placement_status IS NULL OR placement_status IN ('active', 'completed', 'withdrawn'));
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Backfill (runs as the SQL editor role, so existing triggers allow it)
-- ---------------------------------------------------------------------------
-- Legacy flow set status = 'accepted' without moving the pipeline stage.
UPDATE public.applied_internships
SET stage = 'accepted'
WHERE status IN ('accepted', 'approved') AND stage IS DISTINCT FROM 'accepted'
  AND stage NOT IN ('rejected', 'withdrawn');

-- Latest accepted application per student is the active placement; older
-- ones are completed (ended when the next one started).
WITH ranked AS (
  SELECT
    id,
    coalesce(decided_at, created_at) AS start_ts,
    row_number() OVER (PARTITION BY user_id ORDER BY coalesce(decided_at, created_at) DESC, id DESC) AS rn,
    lag(coalesce(decided_at, created_at)) OVER (PARTITION BY user_id ORDER BY coalesce(decided_at, created_at) DESC, id DESC) AS next_start
  FROM public.applied_internships
  WHERE stage = 'accepted'
)
UPDATE public.applied_internships a
SET started_at = coalesce(a.started_at, r.start_ts),
    placement_status = CASE WHEN r.rn = 1 THEN 'active' ELSE 'completed' END,
    ended_at = CASE WHEN r.rn = 1 THEN NULL ELSE coalesce(a.ended_at, r.next_start) END
FROM ranked r
WHERE a.id = r.id AND a.placement_status IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_one_active_placement_per_student
  ON public.applied_internships (user_id)
  WHERE placement_status = 'active';

-- Logbook entries -> placement
ALTER TABLE public.logbook_entries
  ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES public.applied_internships(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_logbook_entries_application ON public.logbook_entries (application_id, date);

-- Each entry goes to the latest placement that had started by its date
-- (falling back to the student's earliest placement).
UPDATE public.logbook_entries e
SET application_id = coalesce(
  (SELECT a.id FROM public.applied_internships a
    WHERE a.user_id = e.student_id AND a.placement_status IS NOT NULL
      AND a.started_at::date <= e.date
    ORDER BY a.started_at DESC LIMIT 1),
  (SELECT a.id FROM public.applied_internships a
    WHERE a.user_id = e.student_id AND a.placement_status IS NOT NULL
    ORDER BY a.started_at ASC LIMIT 1)
)
WHERE e.application_id IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Who can read applications: the student, the internship's employer, admins
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_internship_employer(internship uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM internships i
    WHERE i.id = internship AND (i.employer_id = auth.uid() OR i.poster_id = auth.uid())
  );
$$;
REVOKE ALL ON FUNCTION public.is_internship_employer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_internship_employer(uuid) TO authenticated;

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'applied_internships' AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.applied_internships', pol.policyname);
  END LOOP;
END;
$$;

CREATE POLICY "applications_read_scoped" ON public.applied_internships
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_internship_employer(internship_id)
    OR public.is_platform_admin()
  );

-- ---------------------------------------------------------------------------
-- 4. Who can change what on an application
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER: current_user must be the caller's role.
CREATE OR REPLACE FUNCTION public.protect_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_employer boolean;
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') OR public.is_platform_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF uid IS NULL OR uid <> NEW.user_id THEN
      RAISE EXCEPTION 'Not allowed to create this application' USING ERRCODE = '42501';
    END IF;
    -- Applications always start at the beginning of the pipeline.
    NEW.stage := 'applied';
    NEW.status := 'pending';
    NEW.placement_status := NULL;
    NEW.started_at := NULL;
    NEW.ended_at := NULL;
    NEW.decided_at := NULL;
    NEW.decided_by := NULL;
    NEW.decision_notes := NULL;
    NEW.internal_notes := NULL;
    NEW.match_score := (
      SELECT m.match_score FROM match_results m
      WHERE m.user_id = NEW.user_id AND m.internship_id = NEW.internship_id
    );
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.internship_id IS DISTINCT FROM OLD.internship_id
     OR NEW.cover_letter IS DISTINCT FROM OLD.cover_letter
     OR NEW.match_score IS DISTINCT FROM OLD.match_score
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    RAISE EXCEPTION 'Not allowed to change these application fields' USING ERRCODE = '42501';
  END IF;

  is_employer := public.is_internship_employer(OLD.internship_id);

  -- The student
  IF uid = OLD.user_id AND NOT is_employer THEN
    IF NEW.internal_notes IS DISTINCT FROM OLD.internal_notes
       OR NEW.decision_notes IS DISTINCT FROM OLD.decision_notes
       OR NEW.decided_by IS DISTINCT FROM OLD.decided_by
       OR NEW.tags IS DISTINCT FROM OLD.tags
       OR NEW.resume_link IS DISTINCT FROM OLD.resume_link THEN
      RAISE EXCEPTION 'Not allowed to change these application fields' USING ERRCODE = '42501';
    END IF;

    IF NEW.stage IS DISTINCT FROM OLD.stage THEN
      IF OLD.stage = 'offered' AND NEW.stage = 'accepted' THEN
        IF EXISTS (
          SELECT 1 FROM applied_internships
          WHERE user_id = OLD.user_id AND placement_status = 'active' AND id <> OLD.id
        ) THEN
          RAISE EXCEPTION 'You already have an active internship placement. Mark it complete before accepting another offer.'
            USING ERRCODE = 'P0001', HINT = 'active_placement_exists';
        END IF;
        NEW.status := 'accepted';
        NEW.placement_status := 'active';
        NEW.started_at := now();
        NEW.ended_at := NULL;
        NEW.decided_at := now();
      ELSIF NEW.stage = 'withdrawn' AND OLD.stage NOT IN ('accepted', 'rejected', 'withdrawn') THEN
        NEW.status := OLD.status;
      ELSE
        RAISE EXCEPTION 'Not allowed to move this application to %', NEW.stage USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.placement_status IS DISTINCT FROM OLD.placement_status THEN
      IF OLD.placement_status = 'active' AND NEW.placement_status = 'completed' THEN
        NEW.ended_at := now();
      ELSE
        RAISE EXCEPTION 'Not allowed to change the placement status' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.ended_at IS DISTINCT FROM OLD.ended_at
       OR NEW.decided_at IS DISTINCT FROM OLD.decided_at THEN
      RAISE EXCEPTION 'Not allowed to change these application fields' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- The internship's employer
  IF is_employer THEN
    IF (NEW.stage = 'accepted' AND OLD.stage IS DISTINCT FROM 'accepted')
       OR (NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' AND NEW.stage IS DISTINCT FROM 'accepted') THEN
      RAISE EXCEPTION 'Make an offer instead; only the student can accept it.' USING ERRCODE = '42501';
    END IF;
    IF NEW.placement_status IS DISTINCT FROM OLD.placement_status THEN
      IF OLD.placement_status = 'active' AND NEW.placement_status = 'completed' THEN
        NEW.ended_at := now();
      ELSE
        RAISE EXCEPTION 'Not allowed to change the placement status' USING ERRCODE = '42501';
      END IF;
    END IF;
    -- Moving an accepted application back down the pipeline ends the placement.
    IF OLD.stage = 'accepted' AND NEW.stage IS DISTINCT FROM 'accepted' AND OLD.placement_status = 'active' THEN
      NEW.placement_status := 'withdrawn';
      NEW.ended_at := now();
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not allowed to modify this application' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_application ON public.applied_internships;
CREATE TRIGGER trg_protect_application
BEFORE INSERT OR UPDATE ON public.applied_internships
FOR EACH ROW EXECUTE FUNCTION public.protect_application();

-- Accepting an offer withdraws the student's other open offers.
CREATE OR REPLACE FUNCTION public.withdraw_other_offers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE applied_internships
  SET stage = 'withdrawn',
      decision_notes = coalesce(decision_notes || E'\n', '') || 'Student accepted another offer.'
  WHERE user_id = NEW.user_id AND id <> NEW.id AND stage = 'offered';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdraw_other_offers ON public.applied_internships;
CREATE TRIGGER trg_withdraw_other_offers
AFTER UPDATE OF stage ON public.applied_internships
FOR EACH ROW
WHEN (OLD.stage = 'offered' AND NEW.stage = 'accepted')
EXECUTE FUNCTION public.withdraw_other_offers();

-- ---------------------------------------------------------------------------
-- 5. Logbook entries belong to the student's placement
--    (replaces the function from 20261011000300 with placement rules added)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.protect_logbook_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  placement record;
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF uid IS NOT NULL AND uid = NEW.student_id THEN
    IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
      RAISE EXCEPTION 'Approved logbook entries are locked' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.application_id IS NOT NULL
       AND NEW.application_id IS DISTINCT FROM OLD.application_id THEN
      RAISE EXCEPTION 'Not allowed to move an entry to another placement' USING ERRCODE = '42501';
    END IF;

    IF NEW.application_id IS NULL THEN
      SELECT id INTO NEW.application_id FROM applied_internships
      WHERE user_id = uid AND placement_status = 'active' LIMIT 1;
    END IF;

    SELECT a.user_id, a.placement_status, coalesce(i.employer_id, i.poster_id) AS supervisor
      INTO placement
      FROM applied_internships a JOIN internships i ON i.id = a.internship_id
      WHERE a.id = NEW.application_id;
    IF NOT FOUND OR placement.user_id IS DISTINCT FROM uid THEN
      RAISE EXCEPTION 'You need an active internship placement to write logbook entries.' USING ERRCODE = '42501';
    END IF;
    -- Ended placements are read-only, except entries the supervisor returned.
    IF placement.placement_status IS DISTINCT FROM 'active'
       AND NOT (TG_OP = 'UPDATE' AND OLD.status = 'flagged') THEN
      RAISE EXCEPTION 'This internship placement has ended; its logbook is read-only.' USING ERRCODE = '42501';
    END IF;

    NEW.employer_id := placement.supervisor;
    NEW.status := 'pending';
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
    IF TG_OP = 'INSERT' THEN
      NEW.feedback_notes := NULL;
    ELSE
      NEW.feedback_notes := OLD.feedback_notes;  -- keep the supervisor's last comment
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND uid IS NOT NULL AND uid = OLD.employer_id THEN
    IF NEW.activities_raw IS DISTINCT FROM OLD.activities_raw
       OR NEW.activities_enhanced IS DISTINCT FROM OLD.activities_enhanced
       OR NEW.date IS DISTINCT FROM OLD.date
       OR NEW.student_id IS DISTINCT FROM OLD.student_id
       OR NEW.employer_id IS DISTINCT FROM OLD.employer_id
       OR NEW.application_id IS DISTINCT FROM OLD.application_id THEN
      RAISE EXCEPTION 'Supervisors can only review entries' USING ERRCODE = '42501';
    END IF;
    IF NEW.status NOT IN ('pending', 'approved', 'flagged') THEN
      RAISE EXCEPTION 'Invalid status %', NEW.status USING ERRCODE = '22023';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not allowed to modify this logbook entry' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_logbook_review ON public.logbook_entries;
CREATE TRIGGER trg_protect_logbook_review
BEFORE INSERT OR UPDATE ON public.logbook_entries
FOR EACH ROW EXECUTE FUNCTION public.protect_logbook_review();
