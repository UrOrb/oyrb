-- 057 — Database-level booking conflict prevention
--
-- Why this exists:
-- Application routes already call src/lib/booking-overlap.ts before
-- inserting/updating bookings, but those checks run in separate HTTP/DB
-- statements. Two simultaneous requests can both observe an available
-- slot and then both insert. This trigger moves the final authority into
-- Postgres so every booking write path is protected:
--   • public booking creation
--   • post-Stripe deposit confirmation
--   • manual dashboard bookings
--   • client/pro reschedules
--   • future booking writers
--
-- Scope:
--   Non-cancelled bookings for the same business may not overlap.
--   The existing business-level break_between_appointments_minutes is
--   applied around existing bookings, matching the app's shared helper.
--   Daily break blocks remain app-validated because their current
--   semantics are tied to JS/server-local date expansion; a later
--   timezone hardening pass should move those semantics into an explicit
--   provider-timezone model.

create or replace function public.prevent_booking_conflicts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  break_minutes integer := 15;
  break_interval interval := interval '15 minutes';
  conflict_booking public.bookings%rowtype;
begin
  -- Cancelled bookings do not occupy calendar time. Allow inserts/updates
  -- to cancelled without conflict checks so cancellation flows cannot be
  -- blocked by historical overlaps.
  if new.status = 'cancelled' then
    return new;
  end if;

  -- Non-time status transitions such as confirmed → completed do not
  -- create a new calendar placement. Skipping those keeps legacy data
  -- from blocking unrelated lifecycle updates while still protecting
  -- every insert, reschedule, or cancelled → active restoration.
  if tg_op = 'UPDATE'
    and old.status <> 'cancelled'
    and new.status <> 'cancelled'
    and old.business_id = new.business_id
    and old.start_at = new.start_at
    and old.end_at = new.end_at
  then
    return new;
  end if;

  if new.start_at is null or new.end_at is null or new.end_at <= new.start_at then
    raise exception using
      errcode = '23514',
      message = 'booking end time must be after start time';
  end if;

  -- Serialize all writes for one business's calendar inside the current
  -- transaction. This closes the check-then-insert race even before the
  -- overlap SELECT below runs.
  perform pg_advisory_xact_lock(hashtextextended(new.business_id::text, 0));

  select coalesce(b.break_between_appointments_minutes, 15)
    into break_minutes
  from public.businesses b
  where b.id = new.business_id;

  break_minutes := greatest(0, coalesce(break_minutes, 15));
  break_interval := make_interval(mins => break_minutes);

  select b.*
    into conflict_booking
  from public.bookings b
  where b.business_id = new.business_id
    and b.status <> 'cancelled'
    and (tg_op = 'INSERT' or b.id <> new.id)
    and tstzrange(b.start_at - break_interval, b.end_at + break_interval, '[)')
        && tstzrange(new.start_at, new.end_at, '[)')
  order by b.start_at asc
  limit 1;

  if found then
    raise exception using
      errcode = '23P01',
      message = 'booking time conflicts with an existing booking',
      detail = 'conflicting_booking_id=' || conflict_booking.id::text;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_booking_conflicts on public.bookings;
create trigger trg_prevent_booking_conflicts
  before insert or update of business_id, start_at, end_at, status
  on public.bookings
  for each row
  execute function public.prevent_booking_conflicts();

comment on function public.prevent_booking_conflicts() is
  'Serializes per-business booking writes and rejects overlapping non-cancelled bookings with the configured break buffer.';
