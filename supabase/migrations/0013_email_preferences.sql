-- =============================================================================
-- LitterLink — Email Preferences
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. email_preferences table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_preferences (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Transactional (service-related, default on)
  event_notifications       BOOLEAN NOT NULL DEFAULT TRUE,
  organiser_status_updates  BOOLEAN NOT NULL DEFAULT TRUE,

  -- Marketing (must be opt-in, default off)
  new_nearby_events         BOOLEAN NOT NULL DEFAULT FALSE,
  marketing_emails          BOOLEAN NOT NULL DEFAULT FALSE,
  newsletter                BOOLEAN NOT NULL DEFAULT FALSE,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_email_preferences_user_id
  ON public.email_preferences(user_id);

-- ---------------------------------------------------------------------------
-- 2. Auto-update updated_at timestamp
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_email_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_email_preferences_updated
  BEFORE UPDATE ON public.email_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_email_preferences_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Auto-create email_preferences when a profile is created
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_profile_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.email_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profile_created_email_preferences
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile_email_preferences();

-- ---------------------------------------------------------------------------
-- 4. Backfill preferences for existing profiles
-- ---------------------------------------------------------------------------
INSERT INTO public.email_preferences (user_id)
SELECT id FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.email_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. RLS policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
CREATE POLICY "Users can view own email preferences"
  ON public.email_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own email preferences"
  ON public.email_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can insert their own preferences (for sign-up flow)
CREATE POLICY "Users can insert own email preferences"
  ON public.email_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
