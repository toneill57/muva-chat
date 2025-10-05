-- =====================================================
-- Migration: Create Supabase Storage Bucket for Guest Attachments
-- Purpose: Multi-Modal File Upload (Photos + Documents)
-- Date: 2025-10-05
-- FASE 2.5: Multi-Modal File Upload
-- =====================================================

-- =====================================================
-- 1. Create Storage Bucket
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'guest-attachments',
  'guest-attachments',
  true, -- Public bucket (files accessible via public URL)
  10485760, -- 10MB file size limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. Storage RLS Policies
-- =====================================================

-- Enable RLS on storage.objects (should already be enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Guests can upload files to their own folder
-- Path pattern: {guest_reservation_id}/{conversation_id}/{filename}
CREATE POLICY "Guests can upload own attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'guest-attachments'
    AND (
      -- Extract guest_reservation_id from path (first segment)
      -- Path format: {reservation_id}/{conversation_id}/{filename}
      (storage.foldername(name))[1]::uuid IN (
        SELECT id FROM public.guest_reservations
        WHERE id = auth.uid() -- Guest is authenticated via Supabase Auth (if applicable)
      )
      OR
      -- Allow anonymous uploads (validated by API layer via JWT)
      auth.role() = 'anon'
    )
  );

-- Policy: Guests can view files in their own folder
CREATE POLICY "Guests can view own attachments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'guest-attachments'
    AND (
      (storage.foldername(name))[1]::uuid IN (
        SELECT id FROM public.guest_reservations
        WHERE id = auth.uid()
      )
      OR
      -- Allow public read access (bucket is public)
      true
    )
  );

-- Policy: Guests can update their own files (e.g., re-analyze)
CREATE POLICY "Guests can update own attachments"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'guest-attachments'
    AND (
      (storage.foldername(name))[1]::uuid IN (
        SELECT id FROM public.guest_reservations
        WHERE id = auth.uid()
      )
      OR
      auth.role() = 'anon' -- Allow API layer to handle permissions
    )
  );

-- Policy: Guests can delete their own files
CREATE POLICY "Guests can delete own attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'guest-attachments'
    AND (
      (storage.foldername(name))[1]::uuid IN (
        SELECT id FROM public.guest_reservations
        WHERE id = auth.uid()
      )
      OR
      auth.role() = 'anon' -- Allow API layer to handle permissions
    )
  );

-- =====================================================
-- 3. Comments for Documentation
-- =====================================================

COMMENT ON TABLE storage.objects IS 'Supabase Storage objects table with RLS policies for guest attachments';

-- =====================================================
-- 4. Verification Query (for testing)
-- =====================================================

-- Verify bucket was created
-- SELECT * FROM storage.buckets WHERE id = 'guest-attachments';

-- Verify policies
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
