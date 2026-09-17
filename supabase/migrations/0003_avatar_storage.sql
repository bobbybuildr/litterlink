-- ============================================================
-- 0003: Avatar storage bucket + RLS policies
-- Run in Supabase dashboard → SQL Editor
-- ============================================================

-- Create the avatars bucket (public so URLs work without signing)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view avatars
CREATE POLICY "avatars: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Allow authenticated users to upload to their own folder ({user_id}/avatar.{ext})
CREATE POLICY "avatars: owner upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- Allow authenticated users to replace (upsert) their own avatar
CREATE POLICY "avatars: owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own avatar
CREATE POLICY "avatars: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (string_to_array(name, '/'))[1] = auth.uid()::text
  );
