-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to profiles for CV embeddings
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cv_embedding vector(1024);

-- Add embedding column to internships for job posting embeddings
ALTER TABLE internships ADD COLUMN IF NOT EXISTS job_embedding vector(1024);

-- Add parsed job structure (like cv_structured for profiles)
ALTER TABLE internships ADD COLUMN IF NOT EXISTS job_structured JSONB;

-- Index for fast vector similarity search on internships
CREATE INDEX IF NOT EXISTS idx_internships_job_embedding
    ON internships USING ivfflat (job_embedding vector_cosine_ops)
    WITH (lists = 20);

-- Index for fast vector similarity search on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_cv_embedding
    ON profiles USING ivfflat (cv_embedding vector_cosine_ops)
    WITH (lists = 20);

COMMENT ON COLUMN profiles.cv_embedding IS 'Cohere embed-english-v3.0 embedding of CV text. Computed once at upload.';
COMMENT ON COLUMN internships.job_embedding IS 'Cohere embed-english-v3.0 embedding of job posting. Computed once at creation.';
COMMENT ON COLUMN internships.job_structured IS 'LLM-parsed structured job data: required_skills, domain, etc. Computed once at creation.';
