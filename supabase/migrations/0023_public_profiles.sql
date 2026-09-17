-- =============================================================================
-- LitterLink — Public Profile Fields
--
-- Adds identity fields to profiles to support public profile pages at /profile/[id]:
--   username          — unique handle for the user (optional)
--   bio               — short self-description
--   social_url        — link to a personal/social page
--   public_visibility — whether the profile is visible to the public (default true)
--
-- RLS: The existing "profiles: public read" policy (USING (true)) is kept as-is
-- so organiser names continue to render on event cards and the admin panel can
-- read all profiles. The public_visibility flag is enforced at the application
-- layer in the /profile/[id] page (notFound() if false).
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username         TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS bio              TEXT,
  ADD COLUMN IF NOT EXISTS social_url       TEXT,
  ADD COLUMN IF NOT EXISTS public_visibility BOOLEAN NOT NULL DEFAULT true;

-- Enforce username format: lowercase letters, digits, underscores, 3-30 chars.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format
  CHECK (
    username IS NULL
    OR (
      username ~ '^[a-z0-9_]{3,30}$'
    )
  );

-- Index for fast username lookups (e.g. future /profile/@username routing).
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username
  ON public.profiles(username)
  WHERE username IS NOT NULL;

-- bio is capped at 300 chars.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_bio_length
  CHECK (bio IS NULL OR char_length(bio) <= 300);

-- social_url must look like a URL when set.
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_social_url_format
  CHECK (social_url IS NULL OR social_url ~ '^https?://');
