-- =============================================================================
-- LitterLink — Allow Admins to Cancel Events
-- =============================================================================
-- The existing "events: organiser update" policy only allows the organiser to
-- update their own event (used to set status = 'cancelled', among other
-- things). This adds an additional permissive UPDATE policy so admins can
-- also update events (e.g. to cancel one for moderation reasons). Multiple
-- permissive policies for the same command are OR'd together by Postgres
-- RLS, so this does not affect the existing organiser-update behaviour.

CREATE POLICY "events: admin update"
  ON public.events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND is_admin = TRUE
    )
  );
