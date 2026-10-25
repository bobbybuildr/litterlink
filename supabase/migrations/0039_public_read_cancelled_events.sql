-- =============================================================================
-- LitterLink — Make cancelled event pages publicly readable
-- =============================================================================
-- "events: public read published" only exposed published and completed events,
-- so everyone except the organiser got a 404 for a cancelled event — including
-- participants following the link in the cancellation email and search engines
-- that should see the EventCancelled structured data. Cancelled events are now
-- readable by anyone. Drafts stay visible to their organiser only.
--
-- The app already filters by status wherever cancelled events must not appear
-- (listings, sitemap, dashboard, profiles, impact), so nothing else relied on
-- RLS to hide them.

DROP POLICY IF EXISTS "events: public read published" ON public.events;
DROP POLICY IF EXISTS "events: public read non-draft" ON public.events;

CREATE POLICY "events: public read non-draft"
  ON public.events FOR SELECT USING (
    status IN ('published', 'completed', 'cancelled')
    OR organiser_id = auth.uid()
  );


-- ---------------------------------------------------------------------------
-- groups_with_counts: keep participants of cancelled events out of the
-- activity score. recent_participant_count joins events under RLS, so it used
-- to skip cancelled events by accident; with them now readable it has to
-- exclude them explicitly (recent_event_count already does).
-- Only the rpc subquery changes; the column list is identical to 0033.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.groups_with_counts
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
    AND e.status <> 'cancelled'
    AND ep.joined_at >= now() - INTERVAL '30 days'
  GROUP BY e.group_id
) rpc ON rpc.group_id = g.id;
