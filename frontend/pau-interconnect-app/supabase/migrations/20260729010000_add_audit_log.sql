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
