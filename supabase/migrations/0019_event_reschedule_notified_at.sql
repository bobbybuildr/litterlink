-- Add reschedule_notified_at to track when participants were last emailed about
-- a date/time change. Used to enforce a per-event notification cooldown so an
-- organiser cannot spam participants by repeatedly toggling the event datetime.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS reschedule_notified_at timestamptz;
