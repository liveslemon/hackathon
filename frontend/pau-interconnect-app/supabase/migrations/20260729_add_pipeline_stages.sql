-- Add stage column to applied_internships
ALTER TABLE applied_internships ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'applied'
  CHECK (stage IN ('applied', 'reviewed', 'shortlisted', 'interview', 'offered', 'accepted', 'rejected', 'withdrawn'));

-- Stage history for audit trail
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
