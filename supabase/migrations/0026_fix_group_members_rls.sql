-- =============================================================================
-- LitterLink — Fix group_members self-insert RLS policy
-- =============================================================================
-- The original policy only checked user_id = auth.uid(), which allowed any
-- authenticated user to insert themselves with role = 'organiser' by calling
-- the Supabase API directly. The WITH CHECK now also enforces role = 'member'
-- so self-promotion is impossible through any client.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tighten self-insert policy to block role self-promotion
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "group_members: self insert" ON public.group_members;

CREATE POLICY "group_members: self insert"
  ON public.group_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'member'
  );


-- ---------------------------------------------------------------------------
-- 2. DB-level trigger — creators cannot leave their own group
-- ---------------------------------------------------------------------------
-- The application layer already checks this, but a direct API call bypasses
-- it. This trigger enforces the rule unconditionally at the database level.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_creator_leaving_group()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = OLD.group_id
      AND created_by = OLD.user_id
  ) THEN
    RAISE EXCEPTION 'Group creators cannot leave their own group.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER enforce_creator_cannot_leave
  BEFORE DELETE ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.prevent_creator_leaving_group();
