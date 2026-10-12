-- Migration: 20261013070000_07_admin_platform_management.sql
-- Agent: 07 (Admin Portal & Notification System)
-- Purpose:
--   1. Add account suspension and employer verification fields to profiles.
--   2. Add reminder tracking to internships for idempotent deadline reminders.
--   3. Create decision_audit_log for auditing admin actions (suspensions, verifications, status changes).
--   4. Update notify_employer_on_application trigger to respect employer notification preferences.

-- 1. Profiles updates: suspension and verification
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id);

-- 2. Internships updates: reminder tracking for idempotency
ALTER TABLE internships ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

-- 3. Decision Audit Log (if not already created)
CREATE TABLE IF NOT EXISTS decision_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES profiles(id) NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decision_audit_actor ON decision_audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_audit_target ON decision_audit_log(target_type, target_id);

-- 4. Upgrade notify_employer_on_application trigger function
-- Drops existing trigger first to ensure clean idempotency
DROP TRIGGER IF EXISTS trg_notify_employer_on_application ON applied_internships;

CREATE OR REPLACE FUNCTION notify_employer_on_application()
RETURNS TRIGGER AS $$
DECLARE
  v_employer_id UUID;
  v_role TEXT;
  v_student_name TEXT;
  v_settings JSONB;
  v_notif_prefs JSONB;
BEGIN
  -- Resolve employer: check employer_id, fallback to poster_id
  SELECT COALESCE(i.employer_id, i.poster_id), i.role
  INTO v_employer_id, v_role
  FROM internships i
  WHERE i.id = NEW.internship_id;

  IF v_employer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if employer has opted out of application notifications
  SELECT p.settings, p.notification_preferences
  INTO v_settings, v_notif_prefs
  FROM profiles p
  WHERE p.id = v_employer_id;

  -- Respect opt-out settings: check new_application, application_updates, email_new_applicant
  IF (v_settings->'notifications'->>'new_application' = 'false') OR
     (v_settings->'notifications'->>'application_updates' = 'false') OR
     (v_notif_prefs->>'email_new_applicant' = 'false') OR
     (v_notif_prefs->>'new_application' = 'false') THEN
    RETURN NEW;
  END IF;

  -- Get student name safely
  SELECT COALESCE(full_name, 'A student')
  INTO v_student_name
  FROM profiles
  WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, body, link, metadata)
  VALUES (
    v_employer_id,
    'new_application',
    'New Application Received',
    v_student_name || ' applied for ' || COALESCE(v_role, 'your internship'),
    '/dashboard/employer/internships/' || NEW.internship_id,
    jsonb_build_object('application_id', NEW.id, 'internship_id', NEW.internship_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_employer_on_application
AFTER INSERT ON applied_internships
FOR EACH ROW EXECUTE FUNCTION notify_employer_on_application();
