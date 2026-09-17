-- =============================================================================
-- LitterLink — Auto-enrol group creator as organiser
-- =============================================================================
-- The "group_members: self insert" RLS policy (0026) only allows a user to
-- insert their own membership row with role = 'member', to prevent
-- self-promotion via the API. That means the application-layer insert in
-- `createGroup` (which tries to add the creator with role = 'organiser')
-- is silently rejected by RLS, so creators were never actually being added
-- to `group_members`.
--
-- This trigger fires after a group is inserted and enrols `created_by` as
-- an organiser directly. It runs as SECURITY DEFINER so it can bypass the
-- role = 'member' restriction for this one, trusted, server-controlled case.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enrol_group_creator_as_organiser()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'organiser')
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_group_created_enrol_organiser
  AFTER INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.enrol_group_creator_as_organiser();
