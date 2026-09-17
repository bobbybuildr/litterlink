-- =============================================================================
-- LitterLink — Admin Dashboard Support
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add is_admin to profiles
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;


-- ---------------------------------------------------------------------------
-- 2. RLS — allow admins to read all organiser_applications
--    (existing "owner select" policy already lets users see their own row)
-- ---------------------------------------------------------------------------
CREATE POLICY "organiser_applications: admin read"
  ON public.organiser_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND is_admin = TRUE
    )
  );

-- Admins can update applications (approve / reject)
CREATE POLICY "organiser_applications: admin update"
  ON public.organiser_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND is_admin = TRUE
    )
  );

-- Admins can update any profile (needed to set is_verified_organiser)
CREATE POLICY "profiles: admin update"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND is_admin = TRUE
    )
  );


-- ---------------------------------------------------------------------------
-- 3. Grant yourself admin access
--    Replace <your-user-uuid> with your actual Supabase auth user UUID.
-- ---------------------------------------------------------------------------
-- UPDATE public.profiles SET is_admin = TRUE WHERE id = '<your-user-uuid>';
