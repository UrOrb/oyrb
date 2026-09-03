-- Booking conflict regression for migration 057.
--
-- Run against a Supabase database after applying migrations. The script
-- uses one existing published business + active service, inserts a future
-- booking, then verifies a second overlapping booking is rejected by the
-- database trigger. It rolls back all data it creates.
--
-- Expected final NOTICE:
--   PASS: overlapping booking was rejected by database trigger

begin;

do $$
declare
  v_business_id uuid;
  v_service_id uuid;
  v_client_id uuid;
  v_start timestamptz := date_trunc('hour', now() + interval '180 days');
  v_end timestamptz;
  v_conflict_rejected boolean := false;
begin
  select b.id into v_business_id
  from public.businesses b
  where b.is_published = true
  order by b.created_at asc
  limit 1;

  if v_business_id is null then
    raise exception 'No published business found for booking conflict test';
  end if;

  select s.id into v_service_id
  from public.services s
  where s.business_id = v_business_id and s.active = true
  order by s.created_at asc
  limit 1;

  if v_service_id is null then
    raise exception 'No active service found for booking conflict test business %', v_business_id;
  end if;

  v_end := v_start + interval '60 minutes';

  insert into public.clients (business_id, name, email)
  values (v_business_id, 'Conflict Test Client', 'booking-conflict-test@example.com')
  returning id into v_client_id;

  insert into public.bookings (business_id, client_id, service_id, start_at, end_at, status)
  values (v_business_id, v_client_id, v_service_id, v_start, v_end, 'confirmed');

  begin
    insert into public.bookings (business_id, client_id, service_id, start_at, end_at, status)
    values (v_business_id, v_client_id, v_service_id, v_start, v_end, 'confirmed');
  exception
    when exclusion_violation then
      v_conflict_rejected := true;
    when raise_exception then
      -- Backward-compatible catch if the trigger's errcode changes but
      -- still raises from prevent_booking_conflicts().
      v_conflict_rejected := sqlerrm like '%booking time conflicts%';
  end;

  if not v_conflict_rejected then
    raise exception 'FAIL: overlapping booking was not rejected';
  end if;

  raise notice 'PASS: overlapping booking was rejected by database trigger';
end $$;

rollback;
