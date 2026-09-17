-- ---------------------------------------------------------------------------
-- Add updated_at column to event_stats, auto-maintained via trigger.
-- Defaults to now() so the initial insert (first time stats are recorded)
-- is stamped, and the shared set_updated_at() trigger (see 0018) bumps it
-- on every subsequent update (e.g. when the organiser edits their stats).
-- ---------------------------------------------------------------------------

ALTER TABLE public.event_stats
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill existing rows so updated_at is never NULL
UPDATE public.event_stats SET updated_at = now() WHERE updated_at IS NULL;

CREATE TRIGGER event_stats_set_updated_at
  BEFORE UPDATE ON public.event_stats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
