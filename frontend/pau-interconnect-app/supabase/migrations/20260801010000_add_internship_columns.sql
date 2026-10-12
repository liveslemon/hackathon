ALTER TABLE internships ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS stipend TEXT;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS required_skills TEXT[];
ALTER TABLE internships ADD COLUMN IF NOT EXISTS slots INTEGER DEFAULT 1;
ALTER TABLE internships ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed', 'expired', 'deleted'));
ALTER TABLE internships ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
