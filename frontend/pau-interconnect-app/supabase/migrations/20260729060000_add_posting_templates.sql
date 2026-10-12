-- Templates table
CREATE TABLE IF NOT EXISTS internship_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- e.g. "Summer UX Intern"
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
