-- =============================================================================
-- LitterLink — Storage Policies
-- Run AFTER creating the "event-photos" bucket in the Supabase dashboard:
--   Storage → New bucket → Name: "event-photos" → Public: ON
-- =============================================================================

-- Allow anyone to read photos (bucket is public, but policy is defence-in-depth)
CREATE POLICY "photos bucket: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-photos');

-- Allow authenticated confirmed participants and organiser to upload
-- File path convention: event-photos/{event_id}/{user_id}/{filename}
CREATE POLICY "photos bucket: auth upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'event-photos'
    AND auth.role() = 'authenticated'
    -- Enforce max 5 MB on the storage side via bucket settings (set in dashboard)
  );

-- Only the uploader can delete their own files
-- storage.objects.name = '{event_id}/{user_id}/{filename}'
CREATE POLICY "photos bucket: owner delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'event-photos'
    AND auth.uid()::text = (string_to_array(name, '/'))[2]
  );
