-- ---------------------------------------------------------------------------
-- Add composite index on event_participants(event_id, status).
--
-- Several hot paths filter on both columns simultaneously:
--   - events_with_counts view:  COUNT(...) FILTER (WHERE ep.status = 'confirmed')
--   - joinEvent capacity check: WHERE event_id = ? AND status = 'confirmed'
--   - cancelEvent notification: WHERE event_id = ? AND status = 'confirmed'
--
-- The existing idx_participants_event(event_id) satisfies the join but forces
-- a filter step on status. This index allows an index-only scan for all three.
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_participants_event_status
  ON public.event_participants(event_id, status);
