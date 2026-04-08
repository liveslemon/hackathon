-- Migration: Create logbook_entries table

CREATE TABLE IF NOT EXISTS public.logbook_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    employer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    activities_raw TEXT NOT NULL,
    activities_enhanced TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'flagged')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id, date)
);

-- RLS Policies
ALTER TABLE public.logbook_entries ENABLE ROW LEVEL SECURITY;

-- Students can read their own entries
CREATE POLICY "Students can view own logbook entries"
    ON public.logbook_entries FOR SELECT
    USING (auth.uid() = student_id);

-- Students can insert their own entries
CREATE POLICY "Students can insert own logbook entries"
    ON public.logbook_entries FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- Students can update their own entries (only if not approved)
CREATE POLICY "Students can update own logbook entries"
    ON public.logbook_entries FOR UPDATE
    USING (auth.uid() = student_id AND status != 'approved');

-- Employers can read entries assigned to them
CREATE POLICY "Employers can view assigned logbook entries"
    ON public.logbook_entries FOR SELECT
    USING (auth.uid() = employer_id);

-- Employers can update entries assigned to them (to approve/flag)
CREATE POLICY "Employers can update assigned logbook entries"
    ON public.logbook_entries FOR UPDATE
    USING (auth.uid() = employer_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_logbook_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_logbook_entries_updated_at ON public.logbook_entries;
CREATE TRIGGER update_logbook_entries_updated_at
    BEFORE UPDATE ON public.logbook_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_logbook_updated_at_column();
