-- Run in Supabase SQL Editor if browser uploads fail with RLS/policy errors.
-- Bucket name must match your app: "documents"

-- Allow anonymous clients to upload into the documents bucket
CREATE POLICY "Allow anon uploads to documents"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'documents');

-- Allow anonymous clients to read files (for previews/downloads via public URL)
CREATE POLICY "Allow anon read documents"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'documents');
