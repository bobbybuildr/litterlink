-- ---------------------------------------------------------------------------
-- Atomically enforce max_attendees capacity on event_participants inserts.
--
-- The application-level check in joinEvent() is an early-exit UX guard only.
-- This trigger is the authoritative, race-condition-free enforcement: the
-- COUNT and the INSERT both happen inside the same transaction, so two
-- simultaneous requests cannot both pass a stale count.
--
-- Raises SQLSTATE P0001 with message 'event_full' when capacity is exceeded.
-- The joinEvent server action maps this to a user-friendly error message.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_event_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_max_attendees INTEGER;
  v_confirmed_count BIGINT;
BEGIN
  -- Only enforce for confirmed participants
  IF NEW.status != 'confirmed' THEN
    RETURN NEW;
  END IF;

  SELECT max_attendees
    INTO v_max_attendees
    FROM public.events
   WHERE id = NEW.event_id;

  -- No cap set — allow freely
  IF v_max_attendees IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
    INTO v_confirmed_count
    FROM public.event_participants
   WHERE event_id = NEW.event_id
     AND status = 'confirmed';

  IF v_confirmed_count >= v_max_attendees THEN
    RAISE EXCEPTION 'event_full'
      USING ERRCODE = 'P0001',
            DETAIL  = 'This event has reached its maximum number of attendees.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_event_capacity ON public.event_participants;

CREATE TRIGGER enforce_event_capacity
  BEFORE INSERT ON public.event_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.check_event_capacity();
