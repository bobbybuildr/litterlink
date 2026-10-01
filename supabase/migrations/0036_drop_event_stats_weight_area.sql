-- =============================================================================
-- LitterLink — Drop event_stats.weight_kg and event_stats.area_covered_sqm
--
-- Both columns date from 0001 but no form ever collected them. Their CHECK
-- constraints are dropped along with the columns.
-- =============================================================================

ALTER TABLE public.event_stats
  DROP COLUMN IF EXISTS weight_kg,
  DROP COLUMN IF EXISTS area_covered_sqm;
