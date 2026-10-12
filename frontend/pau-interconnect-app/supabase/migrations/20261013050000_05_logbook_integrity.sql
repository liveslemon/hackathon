-- 20261013050000_05_logbook_integrity.sql
-- Agent 05: SIWES Digital Logbook & Placements Integrity, Tamper-Proofing, and RLS

-- 1. Ensure active placement constraint
CREATE UNIQUE INDEX IF NOT EXISTS uniq_one_active_placement_per_student
  ON public.applied_internships (user_id)
  WHERE placement_status = 'active';

-- 2. Ensure logbook schema columns and indexes
ALTER TABLE public.logbook_entries
  ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES public.applied_internships(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS feedback_notes text;

CREATE INDEX IF NOT EXISTS idx_logbook_entries_application
  ON public.logbook_entries (application_id, date);

CREATE INDEX IF NOT EXISTS idx_logbook_entries_student_date
  ON public.logbook_entries (student_id, date);

CREATE INDEX IF NOT EXISTS idx_logbook_entries_employer_status
  ON public.logbook_entries (employer_id, status);

-- 3. Comprehensive tamper-proof trigger for logbook review
CREATE OR REPLACE FUNCTION public.protect_logbook_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  placement record;
  lagos_today date := (timezone('Africa/Lagos', now()))::date;
  backfill_limit date := lagos_today - 6; -- 7 days including today
BEGIN
  -- Service role and migrations bypass trigger
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  -- Actions by the student
  IF uid IS NOT NULL AND uid = NEW.student_id THEN
    -- Locked once approved
    IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
      RAISE EXCEPTION 'Approved logbook entries are locked and cannot be edited.' USING ERRCODE = '42501';
    END IF;

    -- Prevent moving entry to a different placement or supervisor
    IF TG_OP = 'UPDATE' AND OLD.application_id IS NOT NULL AND NEW.application_id IS DISTINCT FROM OLD.application_id THEN
      RAISE EXCEPTION 'Not allowed to move an entry to another placement.' USING ERRCODE = '42501';
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.employer_id IS DISTINCT FROM OLD.employer_id THEN
      RAISE EXCEPTION 'Not allowed to change the assigned supervisor.' USING ERRCODE = '42501';
    END IF;

    -- Date constraints in Lagos timezone
    IF NEW.date > lagos_today THEN
      RAISE EXCEPTION 'Cannot record logbook entries for future dates.' USING ERRCODE = '42501';
    END IF;

    IF NEW.date < backfill_limit AND NOT (TG_OP = 'UPDATE' AND OLD.status = 'flagged') THEN
      RAISE EXCEPTION 'Entries older than 7 days cannot be logged or modified.' USING ERRCODE = '42501';
    END IF;

    -- Placement resolution and enforcement
    IF NEW.application_id IS NULL THEN
      SELECT id INTO NEW.application_id FROM public.applied_internships
      WHERE user_id = uid AND placement_status = 'active'
      LIMIT 1;
    END IF;

    SELECT a.user_id, a.placement_status, coalesce(i.employer_id, i.poster_id) AS supervisor
      INTO placement
      FROM public.applied_internships a
      JOIN public.internships i ON i.id = a.internship_id
      WHERE a.id = NEW.application_id;

    IF NOT FOUND OR placement.user_id IS DISTINCT FROM uid THEN
      RAISE EXCEPTION 'You must have an active internship placement to record logbook entries.' USING ERRCODE = '42501';
    END IF;

    IF placement.placement_status IS DISTINCT FROM 'active'
       AND NOT (TG_OP = 'UPDATE' AND OLD.status = 'flagged') THEN
      RAISE EXCEPTION 'This internship placement has ended; its logbook is read-only.' USING ERRCODE = '42501';
    END IF;

    -- Auto-bind supervisor from placement
    NEW.employer_id := placement.supervisor;

    -- Reset status & review metadata on student changes
    NEW.status := 'pending';
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;

    IF TG_OP = 'INSERT' THEN
      NEW.feedback_notes := NULL;
    ELSE
      NEW.feedback_notes := OLD.feedback_notes; -- retain supervisor's remarks
    END IF;

    RETURN NEW;
  END IF;

  -- Actions by the supervising employer
  IF TG_OP = 'UPDATE' AND uid IS NOT NULL AND uid = OLD.employer_id THEN
    -- Employer can only review (cannot alter student's logs or assignment)
    IF NEW.activities_raw IS DISTINCT FROM OLD.activities_raw
       OR NEW.activities_enhanced IS DISTINCT FROM OLD.activities_enhanced
       OR NEW.date IS DISTINCT FROM OLD.date
       OR NEW.student_id IS DISTINCT FROM OLD.student_id
       OR NEW.employer_id IS DISTINCT FROM OLD.employer_id
       OR NEW.application_id IS DISTINCT FROM OLD.application_id THEN
      RAISE EXCEPTION 'Supervisors can only update status and feedback notes.' USING ERRCODE = '42501';
    END IF;

    IF NEW.status NOT IN ('pending', 'approved', 'flagged') THEN
      RAISE EXCEPTION 'Invalid logbook status: %', NEW.status USING ERRCODE = '22023';
    END IF;

    NEW.reviewed_by := uid;
    NEW.reviewed_at := now();

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Not authorized to modify this logbook entry.' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_logbook_review ON public.logbook_entries;
CREATE TRIGGER trg_protect_logbook_review
BEFORE INSERT OR UPDATE ON public.logbook_entries
FOR EACH ROW EXECUTE FUNCTION public.protect_logbook_review();

-- 4. Idempotent Row-Level Security Policies
ALTER TABLE public.logbook_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own logbook entries" ON public.logbook_entries;
CREATE POLICY "Students can view own logbook entries"
  ON public.logbook_entries FOR SELECT TO authenticated
  USING (auth.uid() = student_id);

DROP POLICY IF EXISTS "Students can insert own logbook entries" ON public.logbook_entries;
CREATE POLICY "Students can insert own logbook entries"
  ON public.logbook_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id AND (status IS NULL OR status = 'pending'));

DROP POLICY IF EXISTS "Students can update own logbook entries" ON public.logbook_entries;
CREATE POLICY "Students can update own logbook entries"
  ON public.logbook_entries FOR UPDATE TO authenticated
  USING (auth.uid() = student_id AND status != 'approved')
  WITH CHECK (auth.uid() = student_id AND (status IS NULL OR status = 'pending'));

DROP POLICY IF EXISTS "Employers can view assigned logbook entries" ON public.logbook_entries;
CREATE POLICY "Employers can view assigned logbook entries"
  ON public.logbook_entries FOR SELECT TO authenticated
  USING (auth.uid() = employer_id);

DROP POLICY IF EXISTS "Employers can update assigned logbook entries" ON public.logbook_entries;
CREATE POLICY "Employers can update assigned logbook entries"
  ON public.logbook_entries FOR UPDATE TO authenticated
  USING (auth.uid() = employer_id);
