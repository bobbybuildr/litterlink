-- =============================================================================
-- LitterLink — Initial Schema
-- Run this in the Supabase Dashboard → SQL Editor
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ---------------------------------------------------------------------------
-- 1. Custom types (enums)
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('draft', 'published', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE participant_status AS ENUM ('confirmed', 'waitlisted', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------

-- profiles — mirrors auth.users, extended with app-specific fields
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT,
  postcode      TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- events
CREATE TABLE IF NOT EXISTS public.events (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organiser_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT,
  location_postcode   TEXT NOT NULL,
  latitude            DOUBLE PRECISION NOT NULL,
  longitude           DOUBLE PRECISION NOT NULL,
  address_label       TEXT,
  starts_at           TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ,
  max_attendees       INTEGER CHECK (max_attendees IS NULL OR max_attendees > 0),
  status              event_status NOT NULL DEFAULT 'published',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- event_participants (RSVP / waitlist)
CREATE TABLE IF NOT EXISTS public.event_participants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      participant_status NOT NULL DEFAULT 'confirmed',
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

-- event_stats — one-to-one with events, filled post-event by organiser
CREATE TABLE IF NOT EXISTS public.event_stats (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id            UUID NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  bags_collected      INTEGER CHECK (bags_collected IS NULL OR bags_collected >= 0),
  weight_kg           NUMERIC(8,2) CHECK (weight_kg IS NULL OR weight_kg >= 0),
  area_covered_sqm    NUMERIC(10,2) CHECK (area_covered_sqm IS NULL OR area_covered_sqm >= 0),
  actual_attendees    INTEGER CHECK (actual_attendees IS NULL OR actual_attendees >= 0),
  notes               TEXT
);

-- event_photos
CREATE TABLE IF NOT EXISTS public.event_photos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id      UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  uploaded_by   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_events_organiser      ON public.events(organiser_id);
CREATE INDEX IF NOT EXISTS idx_events_status_starts  ON public.events(status, starts_at);
CREATE INDEX IF NOT EXISTS idx_events_location       ON public.events(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_participants_event    ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_user     ON public.event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_event          ON public.event_photos(event_id);


-- ---------------------------------------------------------------------------
-- 4. Haversine distance function (km)
--    Usage: haversine_distance(lat1, lon1, lat2, lon2)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.haversine_distance(
  lat1 FLOAT, lon1 FLOAT,
  lat2 FLOAT, lon2 FLOAT
)
RETURNS FLOAT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  r    FLOAT := 6371;  -- Earth radius km
  dlat FLOAT := radians(lat2 - lat1);
  dlon FLOAT := radians(lon2 - lon1);
  a    FLOAT;
BEGIN
  a := sin(dlat / 2) ^ 2
    + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ^ 2;
  RETURN r * 2 * asin(sqrt(a));
END;
$$;


-- ---------------------------------------------------------------------------
-- 5. Trigger — auto-create profile row on new auth user
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ---------------------------------------------------------------------------
-- 6. Row Level Security — enable on all tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_stats       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_photos      ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- 7. RLS Policies
-- ---------------------------------------------------------------------------

-- ---- profiles ----
-- Anyone can read profiles (needed to display organiser name on events)
CREATE POLICY "profiles: public read"
  ON public.profiles FOR SELECT USING (true);

-- Users can only insert their own profile row
CREATE POLICY "profiles: owner insert"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can only update their own profile
CREATE POLICY "profiles: owner update"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);


-- ---- events ----
-- Anyone can read published or completed events; organiser can also read their own drafts/cancelled
CREATE POLICY "events: public read published"
  ON public.events FOR SELECT USING (
    status IN ('published', 'completed')
    OR organiser_id = auth.uid()
  );

-- Authenticated users can create events (they become the organiser)
CREATE POLICY "events: auth insert"
  ON public.events FOR INSERT WITH CHECK (auth.uid() = organiser_id);

-- Only the organiser can update their own events
CREATE POLICY "events: organiser update"
  ON public.events FOR UPDATE USING (auth.uid() = organiser_id);

-- Only the organiser can delete their own draft events
CREATE POLICY "events: organiser delete draft"
  ON public.events FOR DELETE USING (
    auth.uid() = organiser_id AND status = 'draft'
  );


-- ---- event_participants ----
-- User can see their own rows; organiser can see all participants for their events
CREATE POLICY "participants: self or organiser read"
  ON public.event_participants FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.organiser_id = auth.uid()
    )
  );

-- Authenticated users can join events (they must be the user_id)
CREATE POLICY "participants: auth join"
  ON public.event_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User can update their own status; organiser can manage waitlist
CREATE POLICY "participants: self or organiser update"
  ON public.event_participants FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.organiser_id = auth.uid()
    )
  );

-- User can leave; organiser can remove participants
CREATE POLICY "participants: self or organiser delete"
  ON public.event_participants FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.organiser_id = auth.uid()
    )
  );


-- ---- event_stats ----
-- Anyone can read stats (public impact data)
CREATE POLICY "stats: public read"
  ON public.event_stats FOR SELECT USING (true);

-- Only the event's organiser can insert stats
CREATE POLICY "stats: organiser insert"
  ON public.event_stats FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.organiser_id = auth.uid()
    )
  );

-- Only the event's organiser can update stats
CREATE POLICY "stats: organiser update"
  ON public.event_stats FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.organiser_id = auth.uid()
    )
  );


-- ---- event_photos ----
-- Anyone can read photos
CREATE POLICY "photos: public read"
  ON public.event_photos FOR SELECT USING (true);

-- Authenticated users who uploaded_by = themselves, AND are the organiser OR a confirmed participant
CREATE POLICY "photos: participant or organiser insert"
  ON public.event_photos FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by
    AND (
      EXISTS (
        SELECT 1 FROM public.events e
        WHERE e.id = event_id AND e.organiser_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.event_participants ep
        WHERE ep.event_id = event_photos.event_id
          AND ep.user_id = auth.uid()
          AND ep.status = 'confirmed'
      )
    )
  );

-- Uploader or organiser can delete photos
CREATE POLICY "photos: uploader or organiser delete"
  ON public.event_photos FOR DELETE USING (
    uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.organiser_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- 8. Useful view — events with confirmed attendee count + organiser info
--    (security_invoker = true means RLS is respected on the underlying tables)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.events_with_counts
WITH (security_invoker = true) AS
SELECT
  e.*,
  p.display_name  AS organiser_name,
  p.avatar_url    AS organiser_avatar,
  COUNT(ep.id) FILTER (WHERE ep.status = 'confirmed') AS confirmed_count
FROM public.events e
LEFT JOIN public.profiles p          ON p.id = e.organiser_id
LEFT JOIN public.event_participants ep ON ep.event_id = e.id
GROUP BY e.id, p.display_name, p.avatar_url;
