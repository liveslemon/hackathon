-- Seed data for `internships` (paste into Supabase SQL editor or run as a migration)

INSERT INTO public.internships (company, role, field, category, description, requirements, interests, recruiter_link, deadline)
VALUES
  ('Acme Labs', 'Software Engineering Intern', 'Computer Science', 'Software', 'Work on backend services and APIs.', 'JavaScript/Node, SQL, Git', '{backend,api}', 'https://acme.example/careers', '2026-12-15'),
  ('BrightHealth', 'Data Science Intern', 'Data Science', 'AI/ML', 'Assist with model training and data pipelines.', 'Python, pandas, SQL', '{ml,data}', 'https://brighthealth.example/jobs', '2027-01-31'),
  ('GreenEnergy Co', 'Product Design Intern', 'Design', 'Product', 'Support UX research and prototyping.', 'Figma, user research', '{design,ux}', 'https://greenenergy.example/careers', '2026-11-30'),
  ('FinCore', 'DevOps Intern', 'Computer Science', 'Infrastructure', 'Help automate CI/CD and cloud infra.', 'Docker, CI/CD, AWS', '{devops,cloud}', 'https://fincore.example/jobs', '2026-12-31'),
  ('Nimble Start', 'Frontend Intern', 'Computer Science', 'Software', 'Build modern React UI components.', 'React, TypeScript, CSS', '{frontend,react}', 'https://nimble.example/join', '2027-02-28');

-- You can add more rows or change poster_id to match existing `profiles.id` values.
-- If you run this in the Supabase SQL editor it executes as an admin and bypasses RLS.
-- If you want to seed from a script, use the service role key (keep it secret).
