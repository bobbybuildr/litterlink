-- =============================================================================
-- LitterLink — Fix photo upload policies
-- 1. Restrict event_photos INSERT to organiser-only (was: organiser OR participant)
-- 2. Tighten storage upload policy to enforce path ownership + organiser status
-- 3. Add DB-level trigger to enforce the 10-photo-per-event limit
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. event_photos RLS — organiser-only insert
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "photos: participant or organiser insert" ON public.event_photos;

CREATE POLICY "photos: organiser insert"
  ON public.event_photos FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND e.organiser_id = auth.uid()
        AND e.status = 'completed'
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Storage policy — enforce path ownership and organiser status
--    Path convention: event-photos/{event_id}/{user_id}/{filename}
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "photos bucket: auth upload" ON storage.objects;

CREATE POLICY "photos bucket: organiser upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'event-photos'
    AND auth.role() = 'authenticated'
    -- Second path segment must match the uploading user
    AND (string_to_array(name, '/'))[2] = auth.uid()::text
    -- First path segment must be an event the user organises and that is completed
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id::text = (string_to_array(name, '/'))[1]
        AND e.organiser_id = auth.uid()
        AND e.status = 'completed'
    )
  );

-- ---------------------------------------------------------------------------
-- 3. DB trigger — hard cap of 10 photos per event
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_event_photo_limit()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.event_photos
    WHERE event_id = NEW.event_id
  ) >= 10 THEN
    RAISE EXCEPTION 'Event already has the maximum of 10 photos';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_event_photo_limit ON public.event_photos;

CREATE TRIGGER enforce_event_photo_limit
  BEFORE INSERT ON public.event_photos
  FOR EACH ROW EXECUTE FUNCTION public.check_event_photo_limit();
