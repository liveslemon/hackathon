-- Allow students to update their own applications (e.g. to accept offers or withdraw)

-- Drop it if it existed
DROP POLICY IF EXISTS "Students can update their own applications" ON applied_internships;

CREATE POLICY "Students can update their own applications"
ON applied_internships
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
);
