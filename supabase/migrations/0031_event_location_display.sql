-- =============================================================================
-- LitterLink — Event location display fields
-- =============================================================================
-- Adds resolved, human-readable place fields to `events`, populated from the
-- postcodes.io response at create/edit time (the app already calls this API
-- to geocode lat/lng, so this reuses that same lookup rather than adding new
-- API calls). This lets read paths (e.g. the impact page's "Top areas"
-- section) display a real place name instead of deriving a raw postcode
-- outward code, without needing to call postcodes.io on every page render.
-- =============================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS location_outcode        TEXT,
  ADD COLUMN IF NOT EXISTS location_admin_district TEXT;

CREATE INDEX IF NOT EXISTS idx_events_location_outcode ON public.events(location_outcode);

COMMENT ON COLUMN public.events.location_outcode IS
  'Postcode outward code / district (e.g. "SW1A"), returned directly by postcodes.io as `outcode`.';
COMMENT ON COLUMN public.events.location_admin_district IS
  'Human-readable local authority / district name from postcodes.io (e.g. "Westminster"). Null if postcodes.io has no admin_district for this postcode.';
