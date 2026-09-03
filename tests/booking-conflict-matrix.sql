-- Booking conflict matrix for migration 057. Rollback-safe.

begin;

create temp table booking_conflict_results (
  test_name text,
  pass boolean,
  detail text
) on commit drop;

do $$
declare
  owner_id uuid;
  biz_a uuid;
  biz_b uuid;
  svc_a uuid;
  svc_b uuid;
  client_a uuid;
  client_b uuid;
  base_start timestamptz := date_trunc('day', now() + interval '540 days') + interval '14 hours';
  break_minutes integer := 15;
  rejected boolean;
begin
  select id into owner_id from public.profiles order by created_at asc limit 1;
  if owner_id is null then
    raise exception 'No profile available for test owner';
  end if;

  insert into public.businesses (owner_id, business_name, slug, is_published, break_between_appointments_minutes)
  values (owner_id, 'Conflict Test A', 'conflict-test-a-' || replace(gen_random_uuid()::text, '-', ''), true, 15)
  returning id into biz_a;

  insert into public.businesses (owner_id, business_name, slug, is_published, break_between_appointments_minutes)
  values (owner_id, 'Conflict Test B', 'conflict-test-b-' || replace(gen_random_uuid()::text, '-', ''), true, 15)
  returning id into biz_b;

  insert into public.services (business_id, name, duration_minutes, price_cents, active)
  values (biz_a, 'Conflict Test Service', 60, 1000, true) returning id into svc_a;
  insert into public.services (business_id, name, duration_minutes, price_cents, active)
  values (biz_b, 'Conflict Test Service', 60, 1000, true) returning id into svc_b;

  insert into public.clients (business_id, name, email)
  values (biz_a, 'Conflict Test Client A', 'conflict-a@example.com') returning id into client_a;
  insert into public.clients (business_id, name, email)
  values (biz_b, 'Conflict Test Client B', 'conflict-b@example.com') returning id into client_b;

  -- Exact same appointment.
  insert into public.bookings (business_id, client_id, service_id, start_at, end_at, status)
  values (biz_a, client_a, svc_a, base_start, base_start + interval '60 min', 'confirmed');
  rejected := false;
  begin
    insert into public.bookings (business_id, client_id, service_id, start_at, end_at, status)
    values (biz_a, client_a, svc_a, base_start, base_start + interval '60 min', 'confirmed');
  exception when exclusion_violation then rejected := true;
  end;
  insert into booking_conflict_results values ('exact same appointment', rejected, 'same business/time rejected=' || rejected);

  -- Partial overlap.
  rejected := false;
  begin
    insert into public.bookings (business_id, client_id, service_id, start_at, end_at, status)
    values (biz_a, client_a, svc_a, base_start + interval '30 min', base_start + interval '90 min', 'confirmed');
  exception when exclusion_violation then rejected := true;
  end;
  insert into booking_conflict_results values ('partial overlap', rejected, '2:30-3:30 style overlap rejected=' || rejected);

  -- Contained overlap inside a longer existing booking.
  insert into public.bookings (business_id, client_id, service_id, start_at, end_at, status)
  values (biz_a, client_a, svc_a, base_start + interval '1 day', base_start + interval '1 day' + interval '120 min', 'confirmed');
  rejected := false;
  begin
    insert into public.bookings (business_id, client_id, service_id, start_at, end_at, status)
    values (biz_a, client_a, svc_a, base_start + interval '1 day' + interval '30 min', base_start + interval '1 day' + interval '60 min', 'confirmed');
  exception when exclusion_violation then rejected := true;
  end;
  insert into booking_conflict_results values ('contained overlap', rejected, 'inside longer booking rejected=' || rejected);

  -- Adjacent appointment with 15-minute provider break should conflict.
  rejected := false;
  begin
    insert into public.bookings (business_id, client_id, service_id, start_at, end_at, status)
    values (biz_a, client_a, svc_a, base_start + interval '60 min', base_start + interval '120 min', 'confirmed');
  exception when exclusion_violation then rejected := true;
  end;
  insert into booking_conflict_results values ('adjacent appointment honors break buffer', rejected, '15-min break means immediate adjacency rejected=' || rejected);

  -- After break buffer should be allowed.
  rejected := false;
  begin
    insert into public.bookings (business_id, client_id, service_id, start_at, end_at, status)
    values (biz_a, client_a, svc_a, base_start + interval '75 min', base_start + interval '135 min', 'confirmed');
  exception when exclusion_violation then rejected := true;
  end;
  insert into booking_conflict_results values ('after break buffer allowed', not rejected, 'starts 15 min after end rejected=' || rejected);

  -- Cancelled booking should not block.
  insert into public.bookings (business_id, client_id, service_id, start_at, end_at, status)
  values (biz_a, client_a, svc_a, base_start + interval '2 days', base_start + interval '2 days' + interval '60 min', 'cancelled');
  rejected := false;
  begin
    insert into public.bookings (business_id, client_id, service_id, start_at, end_at, status)
    values (biz_a, client_a, svc_a, base_start + interval '2 days', base_start + interval '2 days' + interval '60 min', 'confirmed');
  exception when exclusion_violation then rejected := true;
  end;
  insert into booking_conflict_results values ('cancelled appointment does not block', not rejected, 'replacement over cancelled rejected=' || rejected);

  -- Different provider/business same time should be allowed.
  rejected := false;
  begin
    insert into public.bookings (business_id, client_id, service_id, start_at, end_at, status)
    values (biz_b, client_b, svc_b, base_start, base_start + interval '60 min', 'confirmed');
  exception when exclusion_violation then rejected := true;
  end;
  insert into booking_conflict_results values ('different business allowed', not rejected, 'same time different business rejected=' || rejected);
end $$;

select * from booking_conflict_results order by test_name;

rollback;
