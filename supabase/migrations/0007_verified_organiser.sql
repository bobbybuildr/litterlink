-- =============================================================================
-- LitterLink — Verified Organiser System & Group Ownership
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add is_verified_organiser to profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified_organiser BOOLEAN NOT NULL DEFAULT FALSE;


-- ---------------------------------------------------------------------------
-- 2. Enum: organiser_application_status
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE organiser_application_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ---------------------------------------------------------------------------
-- 3. organiser_applications table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organiser_applications (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  motivation          TEXT NOT NULL,
  experience          TEXT,
  organisation_name   TEXT,
  social_links        TEXT,
  status              organiser_application_status NOT NULL DEFAULT 'pending',
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organiser_applications_user
  ON public.organiser_applications(user_id);

CREATE INDEX IF NOT EXISTS idx_organiser_applications_status
  ON public.organiser_applications(status);


-- ---------------------------------------------------------------------------
-- 4. groups table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.groups (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url    TEXT,
  created_by  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_slug ON public.groups(slug);


-- ---------------------------------------------------------------------------
-- 5. Add group_id to events
-- ---------------------------------------------------------------------------
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_group ON public.events(group_id);


-- ---------------------------------------------------------------------------
-- 6. RLS — enable on new tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.organiser_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups                 ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- 7. RLS Policies — organiser_applications
-- ---------------------------------------------------------------------------

-- Users can submit their own application (one per user enforced by UNIQUE)
CREATE POLICY "organiser_applications: owner insert"
  ON public.organiser_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only read their own application
CREATE POLICY "organiser_applications: owner select"
  ON public.organiser_applications FOR SELECT
  USING (auth.uid() = user_id);


-- ---------------------------------------------------------------------------
-- 8. RLS Policies — groups
-- ---------------------------------------------------------------------------

-- Anyone can read groups (used for public event affiliation display)
CREATE POLICY "groups: public read"
  ON public.groups FOR SELECT USING (true);

-- Only verified organisers can create groups
CREATE POLICY "groups: verified organiser insert"
  ON public.groups FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND is_verified_organiser = TRUE
    )
  );

-- Only the group owner can update their group
CREATE POLICY "groups: owner update"
  ON public.groups FOR UPDATE
  USING (auth.uid() = created_by);

-- Only the group owner can delete their group
CREATE POLICY "groups: owner delete"
  ON public.groups FOR DELETE
  USING (auth.uid() = created_by);


-- ---------------------------------------------------------------------------
-- 9. RLS Policies — events (extend insert policy with group ownership check)
-- ---------------------------------------------------------------------------

-- Restore open authenticated insert; add group ownership guard
DROP POLICY IF EXISTS "events: auth insert" ON public.events;
DROP POLICY IF EXISTS "events: verified organiser insert" ON public.events;

CREATE POLICY "events: auth insert"
  ON public.events FOR INSERT
  WITH CHECK (
    auth.uid() = organiser_id
    -- If group_id is provided, the group must be owned by the current user
    AND (
      group_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.groups
        WHERE id = group_id
          AND created_by = auth.uid()
      )
    )
  );
