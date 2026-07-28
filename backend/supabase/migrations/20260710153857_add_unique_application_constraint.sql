-- Prevent duplicate applications (same student applying to same internship twice)
-- This fixes the race condition identified in improvement 07
ALTER TABLE applied_internships
ADD CONSTRAINT unique_user_internship UNIQUE (user_id, internship_id);
