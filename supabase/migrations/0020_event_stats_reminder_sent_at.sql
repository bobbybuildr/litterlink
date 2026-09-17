-- Add stats_reminder_sent_at to track when the organiser was last emailed
-- asking them to enter post-event stats. Set to now() after the email is sent;
-- NULL means the reminder has not yet been dispatched.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS stats_reminder_sent_at timestamptz;
