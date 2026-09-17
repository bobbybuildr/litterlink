-- =============================================================================
-- LitterLink — Add notable_brands free-text field to event_stats
-- =============================================================================

ALTER TABLE public.event_stats
  ADD COLUMN IF NOT EXISTS notable_brands TEXT;
