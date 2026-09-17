-- =============================================================================
-- Fix: participant count visible to all users
--
-- The events_with_counts view uses security_invoker = true, so RLS on
-- event_participants is evaluated as the calling user. The existing SELECT
-- policy ("participants: self or organiser read") only lets a user see their
-- own rows, which meant confirmed_count showed as 0 for users who hadn't
-- joined an event.
--
-- Fix: add a policy that allows any authenticated or anonymous user to read
-- rows where status = 'confirmed'. The count of confirmed participants is
-- intentionally public (it's already rendered on every event card). The
-- existing "self or organiser" policy is kept so users can still read their
-- own non-confirmed (waitlisted / cancelled) rows.
-- =============================================================================

CREATE POLICY "participants: public read confirmed"
  ON public.event_participants FOR SELECT
  USING (status = 'confirmed');
