-- =============================================================================
-- LitterLink — Expose event place fields in events_with_counts
-- =============================================================================
-- 0031 added `location_outcode` and `location_admin_district` to `events`, but
-- this view lists its columns explicitly (0024) and was never rebuilt, so every
-- read through it got neither field. Event page titles and share images then
-- fell back to the raw postcode instead of a place name such as "Bromsgrove".
--
-- CREATE OR REPLACE (rather than DROP + CREATE) keeps the view, its grants and
-- any dependants in place. Postgres only allows new columns at the end, so the
-- existing column list is unchanged and the two fields are appended.
-- =============================================================================

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
  e.location_admin_district
FROM public.events e
LEFT JOIN public.profiles p            ON p.id = e.organiser_id
LEFT JOIN public.groups g              ON g.id = e.group_id
LEFT JOIN public.event_participants ep ON ep.event_id = e.id
GROUP BY e.id, p.display_name, p.username, p.avatar_url, p.is_verified_organiser, g.name, g.slug;
