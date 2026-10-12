-- =============================================================================
-- LitterLink — Group slug history
-- =============================================================================
-- Renaming a group regenerates its slug (see updateGroup), which used to turn
-- the old /groups/{slug} URL into a 404 and throw away any links or search
-- ranking it had. Old slugs are now recorded here so the group page can issue
-- a permanent redirect to the current slug.
--
-- Maintained entirely by trigger (SECURITY DEFINER), so no client-side write
-- policies are needed. A live group always wins: whenever a group takes a slug
-- (insert or rename), any history row for that slug is removed.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.group_slug_history (
  slug       TEXT PRIMARY KEY,
  group_id   UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_slug_history_group_id
  ON public.group_slug_history(group_id);

ALTER TABLE public.group_slug_history ENABLE ROW LEVEL SECURITY;

-- Group pages are public, so their former URLs are too.
CREATE POLICY "group_slug_history: public read"
  ON public.group_slug_history FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.record_group_slug_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.group_slug_history WHERE slug = NEW.slug;

  IF TG_OP = 'UPDATE' AND OLD.slug IS DISTINCT FROM NEW.slug THEN
    INSERT INTO public.group_slug_history (slug, group_id)
    VALUES (OLD.slug, NEW.id)
    ON CONFLICT (slug) DO UPDATE
      SET group_id = EXCLUDED.group_id,
          created_at = NOW();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_group_slug_change
  AFTER INSERT OR UPDATE OF slug ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.record_group_slug_change();
