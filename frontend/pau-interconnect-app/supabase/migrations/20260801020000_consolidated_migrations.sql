-- 1. Updates to the core internships table
ALTER TABLE internships ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS stipend TEXT;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS required_skills TEXT[];
ALTER TABLE internships ADD COLUMN IF NOT EXISTS slots INTEGER DEFAULT 1;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed', 'expired', 'deleted'));
ALTER TABLE internships ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- 2. Updates to the profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitter_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_size TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_location TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email_new_applicant": true, "email_logbook_submitted": true, "email_deadline_reminder": true}';

-- 3. Updates to the applied_internships table for the Pipeline Kanban & Audits
ALTER TABLE applied_internships ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'applied'
  CHECK (stage IN ('applied', 'reviewed', 'shortlisted', 'interview', 'offered', 'accepted', 'rejected', 'withdrawn'));
ALTER TABLE applied_internships ADD COLUMN IF NOT EXISTS decision_notes TEXT;
ALTER TABLE applied_internships ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE applied_internships ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
ALTER TABLE applied_internships ADD COLUMN IF NOT EXISTS decided_by UUID REFERENCES profiles(id);
ALTER TABLE applied_internships ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 4. Application Audit Log Table
CREATE TABLE IF NOT EXISTS application_stage_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applied_internships(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stage_history_app ON application_stage_history(application_id);

-- 5. Decision Audit Log Table for tracking logbook and application events
CREATE TABLE IF NOT EXISTS decision_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id UUID REFERENCES profiles(id) NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON decision_audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target ON decision_audit_log(target_type, target_id);

-- 6. Notifications system
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- Conditional create trigger pattern requires catching existing triggers so we DROP first just in case
DROP TRIGGER IF EXISTS trg_notify_employer_on_application ON applied_internships;

CREATE OR REPLACE FUNCTION notify_employer_on_application()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, link, metadata)
  SELECT
    i.employer_id,
    'new_application',
    'New Application Received',
    (SELECT full_name FROM profiles WHERE id = NEW.user_id) || ' applied for ' || i.role,
    '/dashboard/employer/internships/' || NEW.internship_id,
    jsonb_build_object('application_id', NEW.id, 'internship_id', NEW.internship_id)
  FROM internships i WHERE i.id = NEW.internship_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_employer_on_application
AFTER INSERT ON applied_internships
FOR EACH ROW EXECUTE FUNCTION notify_employer_on_application();

-- 7. Messaging system
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applied_internships(id) ON DELETE CASCADE,
  employer_id UUID REFERENCES profiles(id) NOT NULL,
  student_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(application_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES profiles(id) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_employer ON conversations(employer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_student ON conversations(student_id);

-- 8. Posting Templates system
CREATE TABLE IF NOT EXISTS internship_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, 
  role TEXT,
  field TEXT,
  category TEXT,
  description TEXT,
  requirements TEXT,
  tags TEXT[],
  location TEXT,
  duration TEXT,
  stipend TEXT,
  recruiter_link TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_employer ON internship_templates(employer_id);

-- 9. Company Followers
CREATE TABLE IF NOT EXISTS company_followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  followed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, company_id)
);

-- 10. Logbook reviews
ALTER TABLE logbook_entries ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE logbook_entries ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id);

-- Enable realtime for new tables if needed
-- Ignore duplicate publication addition if it already exists
DO $$
BEGIN
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications') then
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    end if;
END
$$;
