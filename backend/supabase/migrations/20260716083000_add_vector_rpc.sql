-- Create a function to perform vector similarity search inside Postgres
-- This moves the mathematical comparison from Python into the database natively.

-- Drop the old function first if it exists since we changed the return signature (title to role)
DROP FUNCTION IF EXISTS match_internships(vector, float, int);

CREATE OR REPLACE FUNCTION match_internships (
  query_embedding vector(1024),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  role varchar,
  company varchar,
  description text,
  requirements text,
  category varchar,
  job_structured jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    internships.id,
    internships.role,
    internships.company,
    internships.description,
    internships.requirements,
    internships.category,
    internships.job_structured,
    1 - (internships.job_embedding <=> query_embedding) AS similarity
  FROM internships
  WHERE internships.job_embedding IS NOT NULL
    AND 1 - (internships.job_embedding <=> query_embedding) > match_threshold
  ORDER BY internships.job_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;