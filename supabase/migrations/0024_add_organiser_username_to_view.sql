-- Add organiser_username to events_with_counts view so that event detail pages
-- can link to /profile/[username] instead of falling back to the organiser UUID.

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
  p.username              AS organiser_username,
  p.avatar_url            AS organiser_avatar,
  p.is_verified_organiser AS organiser_is_verified,
  g.name                  AS group_name,
  g.slug                  AS group_slug,
  COUNT(ep.id) FILTER (WHERE ep.status = 'confirmed') AS confirmed_count
FROM public.events e
LEFT JOIN public.profiles p            ON p.id = e.organiser_id
LEFT JOIN public.groups g              ON g.id = e.group_id
LEFT JOIN public.event_participants ep ON ep.event_id = e.id
GROUP BY e.id, p.display_name, p.username, p.avatar_url, p.is_verified_organiser, g.name, g.slug;
