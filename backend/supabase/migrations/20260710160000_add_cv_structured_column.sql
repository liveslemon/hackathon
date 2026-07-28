-- Add cv_structured column to store parsed CV data (JSON)
-- This is populated once at CV upload time and reused for all match computations
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cv_structured JSONB;

-- Add index for filtering students with structured CVs
CREATE INDEX IF NOT EXISTS idx_profiles_cv_structured
    ON profiles (role) WHERE cv_structured IS NOT NULL;

COMMENT ON COLUMN profiles.cv_structured IS 'LLM-parsed structured CV data: skills, experience, education, projects. Populated at upload time.';
