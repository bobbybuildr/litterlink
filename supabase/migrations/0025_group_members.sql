-- =============================================================================
-- LitterLink — Group Members Table
-- =============================================================================
-- Makes groups joinable, forming the community infrastructure layer that
-- complements event discovery with group discovery.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. group_members table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.group_members (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id  UUID        NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role      TEXT        NOT NULL DEFAULT 'member'
                        CHECK (role IN ('member', 'organiser')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group  ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user   ON public.group_members(user_id);


-- ---------------------------------------------------------------------------
-- 2. Enable Row-Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- 3. RLS Policies
-- ---------------------------------------------------------------------------

-- Read: public
CREATE POLICY "group_members: public read"
  ON public.group_members FOR SELECT
  USING (true);

-- Insert: authenticated users can only insert their own membership row
CREATE POLICY "group_members: self insert"
  ON public.group_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Delete: users can only remove their own membership row
CREATE POLICY "group_members: self delete"
  ON public.group_members FOR DELETE
  USING (user_id = auth.uid());

-- Update role: only a group organiser or a site admin may change roles
CREATE POLICY "group_members: organiser or admin update"
  ON public.group_members FOR UPDATE
  USING (
    -- Caller is an organiser of this group
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id  = auth.uid()
        AND gm.role     = 'organiser'
    )
    OR
    -- Caller is a site admin
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id       = auth.uid()
        AND is_admin = TRUE
    )
  );
