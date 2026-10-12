-- Drop existing policies if creating conflicts
-- But since we don't know the names, we can just create new ones.

-- Allow authenticated users to view all student profiles
CREATE POLICY "Allow authenticated users to read student profiles"
ON profiles FOR SELECT TO authenticated
USING (role = 'student');

-- Allow authenticated users to view all employer profiles
CREATE POLICY "Allow authenticated users to read employer profiles"
ON profiles FOR SELECT TO authenticated
USING (role = 'employer');
