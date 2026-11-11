-- =============================================================================
-- LitterLink — Event icon
-- =============================================================================
-- Lets organisers pick a small icon that represents their event on event cards.
-- Only a stable key (e.g. 'tree-pine') is stored. The allowlist of keys, their
-- labels and their Lucide components live in `src/lib/event-icons.ts`; unknown
-- or NULL keys render the default icon, so existing events need no backfill.
--
-- The CHECK constrains the *shape* of the key only, not the allowlist, so adding
-- an icon never needs a migration. Organisers can update their own events
-- through PostgREST directly, bypassing the server action's allowlist
-- validation, so this stops arbitrary text being stored in the column.
--
-- `events_with_counts` lists its columns explicitly (see 0024 / 0038), so it is
-- recreated with CREATE OR REPLACE to expose the new column. Postgres only
-- allows new columns at the end, so the existing column list is unchanged and
-- `icon_key` is appended.
-- =============================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS icon_key TEXT
  CONSTRAINT events_icon_key_format
    CHECK (icon_key IS NULL OR (char_length(icon_key) <= 50 AND icon_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'));

COMMENT ON COLUMN public.events.icon_key IS
  'Stable key of the organiser-selected event icon (e.g. "tree-pine"), validated against the allowlist in src/lib/event-icons.ts. NULL means the default icon.';

CREATE OR REPLACE VIEW public.events_with_counts
WITH (security_invoker = true) AS
SELECT
  e.id,
  e.organiser_id,
  e.group_id,
  e.title,
  e.description,
  e.location_postcode,
  e.latitude,
  e.longitude,
  e.address_label,
  e.starts_at,
  e.ends_at,
  e.max_attendees,
  e.status,
  e.created_at,
  e.updated_at,
  e.content_updated_at,
  e.organiser_contact_details,
  e.reschedule_notified_at,
  e.stats_reminder_sent_at,
  p.display_name          AS organiser_name,
  p.username              AS organiser_username,
  p.avatar_url            AS organiser_avatar,
  p.is_verified_organiser AS organiser_is_verified,
  g.name                  AS group_name,
  g.slug                  AS group_slug,
  COUNT(ep.id) FILTER (WHERE ep.status = 'confirmed') AS confirmed_count,
  e.location_outcode,
  e.location_admin_district,
  e.icon_key
FROM public.events e
LEFT JOIN public.profiles p            ON p.id = e.organiser_id
LEFT JOIN public.groups g              ON g.id = e.group_id
LEFT JOIN public.event_participants ep ON ep.event_id = e.id
GROUP BY e.id, p.display_name, p.username, p.avatar_url, p.is_verified_organiser, g.name, g.slug;
