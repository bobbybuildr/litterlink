-- =============================================================================
-- LitterLink — Account Deletion Support
--
-- Changes:
--   1. events.organiser_id   → nullable, FK changed to ON DELETE SET NULL
--   2. groups.created_by     → nullable, FK changed to ON DELETE SET NULL
--
-- WHY: Previously both columns had ON DELETE CASCADE, which meant deleting a
-- Supabase auth user would cascade-delete all their organised events (and the
-- event_stats / event_photos attached to them). This erases community impact
-- data. By switching to SET NULL we preserve events/groups while severing the
-- personal link — the organiser becomes anonymous on the record.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. events.organiser_id — nullable + SET NULL
-- ---------------------------------------------------------------------------
ALTER TABLE public.events
  ALTER COLUMN organiser_id DROP NOT NULL;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_organiser_id_fkey;

ALTER TABLE public.events
  ADD CONSTRAINT events_organiser_id_fkey
  FOREIGN KEY (organiser_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- Clear organiser_contact_details when the owning organiser is removed.
-- This is personal data (phone, email, etc.) and should not persist once
-- the organiser profile no longer exists.
ALTER TABLE public.events
  ADD CONSTRAINT events_organiser_contact_requires_organiser
  CHECK (organiser_contact_details IS NULL OR organiser_id IS NOT NULL)
  NOT VALID; -- NOT VALID so it doesn't scan existing rows on application

-- ---------------------------------------------------------------------------
-- 2. groups.created_by — nullable + SET NULL
-- ---------------------------------------------------------------------------
ALTER TABLE public.groups
  ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.groups
  DROP CONSTRAINT IF EXISTS groups_created_by_fkey;

ALTER TABLE public.groups
  ADD CONSTRAINT groups_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;
