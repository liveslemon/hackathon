-- Employers need to be able to UPDATE applied_internships
-- because they update the tracking stage and status.

-- Drop existing UPDATE policies if they conflict
DROP POLICY IF EXISTS "Employers can update applications for their internships" ON applied_internships;

-- Allow employers to update applications that point to internships they own
CREATE POLICY "Employers can update applications for their internships" 
ON applied_internships 
FOR UPDATE 
TO authenticated 
USING (
  internship_id IN (
    SELECT id FROM internships WHERE employer_id = auth.uid()
  )
)
WITH CHECK (
  internship_id IN (
    SELECT id FROM internships WHERE employer_id = auth.uid()
  )
);
