-- ---------------------------------------------------------------------------
-- Tighten event_photos DELETE policy to uploader-only.
--
-- The original "uploader or organiser" policy allowed the event organiser to
-- delete the DB record for a photo they didn't upload. Because the storage
-- delete policy is restricted to the uploader (second path segment = uid),
-- an organiser deleting via the API would leave an orphaned storage object.
-- The app action already enforces uploader-only; this migration makes the DB
-- RLS consistent with both the storage policy and the application logic.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "photos: uploader or organiser delete" ON public.event_photos;

CREATE POLICY "photos: uploader delete"
  ON public.event_photos FOR DELETE
  USING (uploaded_by = auth.uid());
