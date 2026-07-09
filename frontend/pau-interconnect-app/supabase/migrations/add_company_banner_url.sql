-- Add company_banner_url to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_banner_url text;

-- Create the company_assets bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('company_assets', 'company_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS for company_assets
-- 1. Allow public read access to company_assets
CREATE POLICY "Public Access for company_assets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'company_assets');

-- 2. Allow authenticated users to upload to company_assets
CREATE POLICY "Authenticated users can upload to company_assets" 
ON storage.objects FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'company_assets');

-- 3. Allow users to update/delete their own uploads
CREATE POLICY "Users can update their own uploads in company_assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'company_assets' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own uploads in company_assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'company_assets' AND auth.uid() = owner);
