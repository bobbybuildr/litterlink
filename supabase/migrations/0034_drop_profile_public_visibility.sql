-- =============================================================================
-- LitterLink — Drop profiles.public_visibility
--
-- The privacy opt-out added in 0023 was never enforced or exposed in the UI.
-- Profile pages are intentionally always visible to signed-in users; users
-- control exposure by choosing what (if anything) to add to their profile.
-- =============================================================================

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS public_visibility;
