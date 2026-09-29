-- =============================================================================
-- LitterLink — Per-IP rate limiting for the public geocoding API routes
--
-- /api/geocode and /api/reverse-geocode are intentionally anonymous, so they
-- are limited per client IP instead of per user. Counters live in Postgres so
-- the limit holds across every serverless instance.
--
-- Keys are "<bucket>:<sha256(ip)>" — raw IP addresses are never stored — and
-- rows are purged shortly after their window ends.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  key           TEXT        PRIMARY KEY,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS api_rate_limits_window_start_idx
  ON public.api_rate_limits (window_start);

-- No policies: only the service role (which bypasses RLS) can touch this table.
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.api_rate_limits FROM anon, authenticated;

-- Atomically records one request against a fixed window.
-- Returns 0 when the request is allowed, otherwise the seconds until the window resets.
CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key            TEXT,
  p_limit          INTEGER,
  p_window_seconds INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_window INTERVAL := make_interval(secs => p_window_seconds);
  v_count  INTEGER;
  v_start  TIMESTAMPTZ;
BEGIN
  INSERT INTO public.api_rate_limits AS r (key, window_start, request_count)
  VALUES (p_key, now(), 1)
  ON CONFLICT (key) DO UPDATE SET
    window_start  = CASE WHEN r.window_start <= now() - v_window
                         THEN now() ELSE r.window_start END,
    request_count = CASE WHEN r.window_start <= now() - v_window
                         THEN 1 ELSE r.request_count + 1 END
  RETURNING r.request_count, r.window_start INTO v_count, v_start;

  IF v_count <= p_limit THEN
    RETURN 0;
  END IF;

  RETURN GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_start + v_window - now())))::INTEGER);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER)
  TO service_role;

-- pg_cron is enabled in 0021.
SELECT cron.schedule(
  'purge-api-rate-limits',
  '0 * * * *',
  $$DELETE FROM public.api_rate_limits WHERE window_start < now() - interval '1 hour'$$
);
