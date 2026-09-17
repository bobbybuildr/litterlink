-- Add content_updated_at to events.
-- Unlike updated_at (which fires on every row change including system fields),
-- content_updated_at is set explicitly only when user-visible content changes
-- (title, description, location, date/time, contact details) via the
-- updateEvent action. NULL means the event has never been edited by the organiser.

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS content_updated_at timestamptz;

-- Rebuild events_with_counts view to expose the new column.
DROP VIEW IF EXISTS public.events_with_counts;

CREATE VIEW public.events_with_counts
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
  p.avatar_url            AS organiser_avatar,
  p.is_verified_organiser AS organiser_is_verified,
  g.name                  AS group_name,
  g.slug                  AS group_slug,
  COUNT(ep.id) FILTER (WHERE ep.status = 'confirmed') AS confirmed_count
FROM public.events e
LEFT JOIN public.profiles p            ON p.id = e.organiser_id
LEFT JOIN public.groups g              ON g.id = e.group_id
LEFT JOIN public.event_participants ep ON ep.event_id = e.id
GROUP BY e.id, p.display_name, p.avatar_url, p.is_verified_organiser, g.name, g.slug;
