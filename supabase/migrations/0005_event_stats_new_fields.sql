-- =============================================================================
-- LitterLink — Add duration_hours, litter_types, hotspot_severity to event_stats
-- =============================================================================

ALTER TABLE public.event_stats
  ADD COLUMN IF NOT EXISTS duration_hours   NUMERIC(4,1)  CHECK (duration_hours IS NULL OR duration_hours > 0),
  ADD COLUMN IF NOT EXISTS litter_types     TEXT[]        DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hotspot_severity SMALLINT      CHECK (hotspot_severity IS NULL OR hotspot_severity BETWEEN 1 AND 5);
