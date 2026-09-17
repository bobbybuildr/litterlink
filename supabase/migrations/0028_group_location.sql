-- =============================================================================
-- LitterLink — Group location fields
-- =============================================================================
-- Groups need a location independent of any event, so they can be discovered
-- by area before "group discovery" is built. Mirrors the location approach
-- already used on `events` (canonical postcode + geocoded lat/lng), plus a
-- friendly display name (e.g. "Bromsgrove", "Birmingham City Centre").
-- =============================================================================

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS location_postcode TEXT,
  ADD COLUMN IF NOT EXISTS latitude          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude         DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_name     TEXT;

CREATE INDEX IF NOT EXISTS idx_groups_location ON public.groups(latitude, longitude);
