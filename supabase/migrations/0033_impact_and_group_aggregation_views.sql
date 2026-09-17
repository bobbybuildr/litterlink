-- =============================================================================
-- LitterLink — Aggregation views (fixes tech-debt H2 and M10)
-- =============================================================================
-- Moves aggregation that was previously pulled wholesale into the app (and
-- therefore silently truncated at PostgREST's 1000-row-per-request cap) into
-- Postgres, mirroring the existing events_with_counts pattern.

-- ---------------------------------------------------------------------------
-- 1. groups_with_counts (M10) — replaces getPublishedGroups()'s full scan of
--    groups + group_members + group-linked events, aggregated in JavaScript.
--    activity_score mirrors the previous weighting: recent joins x3, recent
--    events x5, recent event participants x2, over a trailing 30-day window.
-- ---------------------------------------------------------------------------
CREATE VIEW public.groups_with_counts
WITH (security_invoker = true) AS
SELECT
  g.id,
  g.name,
  g.slug,
  g.description,
  g.logo_url,
  g.website_url,
  g.social_url,
  g.contact_email,
  g.group_type,
  g.location_postcode,
  g.latitude,
  g.longitude,
  g.location_name,
  g.created_by,
  g.created_at,
  COALESCE(p.is_verified_organiser, false) AS creator_is_verified,
  COALESCE(mc.member_count, 0)             AS member_count,
  COALESCE(uec.upcoming_event_count, 0)    AS upcoming_event_count,
  (COALESCE(rmc.recent_member_count, 0)      * 3
    + COALESCE(rec.recent_event_count, 0)      * 5
    + COALESCE(rpc.recent_participant_count, 0) * 2) AS activity_score
FROM public.groups g
LEFT JOIN public.profiles p ON p.id = g.created_by
LEFT JOIN (
  SELECT group_id, COUNT(*) AS member_count
  FROM public.group_members
  GROUP BY group_id
) mc ON mc.group_id = g.id
LEFT JOIN (
  SELECT group_id, COUNT(*) AS upcoming_event_count
  FROM public.events
  WHERE status = 'published' AND starts_at >= now()
  GROUP BY group_id
) uec ON uec.group_id = g.id
LEFT JOIN (
  SELECT group_id, COUNT(*) AS recent_member_count
  FROM public.group_members
  WHERE joined_at >= now() - INTERVAL '30 days'
  GROUP BY group_id
) rmc ON rmc.group_id = g.id
LEFT JOIN (
  SELECT group_id, COUNT(*) AS recent_event_count
  FROM public.events
  WHERE status <> 'cancelled'
    AND starts_at >= now() - INTERVAL '30 days'
    AND starts_at <= now()
  GROUP BY group_id
) rec ON rec.group_id = g.id
LEFT JOIN (
  SELECT e.group_id, COUNT(*) AS recent_participant_count
  FROM public.event_participants ep
  JOIN public.events e ON e.id = ep.event_id
  WHERE ep.status = 'confirmed'
    AND ep.joined_at >= now() - INTERVAL '30 days'
  GROUP BY e.group_id
) rpc ON rpc.group_id = g.id;


-- ---------------------------------------------------------------------------
-- 2. national_impact_stats (H2) — pre-summed totals for the /impact headline
--    figures, replacing an unbounded `SELECT * FROM event_stats` that
--    silently under-reported past 1000 rows.
-- ---------------------------------------------------------------------------
CREATE VIEW public.national_impact_stats
WITH (security_invoker = true) AS
SELECT
  COALESCE(SUM(bags_collected), 0)::bigint   AS total_bags,
  COALESCE(SUM(actual_attendees), 0)::bigint AS total_volunteers,
  COALESCE(SUM(duration_hours), 0)::numeric  AS total_hours
FROM public.event_stats;


-- ---------------------------------------------------------------------------
-- 3. litter_type_counts (H2) — frequency of each litter type across all
--    logged stats, aggregated in Postgres instead of counted in JavaScript
--    over a row set that was subject to the same 1000-row cap.
-- ---------------------------------------------------------------------------
CREATE VIEW public.litter_type_counts
WITH (security_invoker = true) AS
SELECT lt AS litter_type, COUNT(*) AS count
FROM public.event_stats, unnest(litter_types) AS lt
GROUP BY lt
ORDER BY count DESC;
