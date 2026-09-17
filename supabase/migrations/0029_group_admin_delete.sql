-- =============================================================================
-- LitterLink — Allow Admins to Delete Groups
-- =============================================================================
-- The existing "groups: owner delete" policy only allows the group creator to
-- delete their group. This adds an additional permissive DELETE policy so
-- admins can also delete groups (e.g. for moderation). Multiple permissive
-- policies for the same command are OR'd together by Postgres RLS, so this
-- does not affect the existing owner-delete behaviour.

CREATE POLICY "groups: admin delete"
  ON public.groups FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND is_admin = TRUE
    )
  );
