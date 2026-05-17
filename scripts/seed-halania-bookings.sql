-- ═════════════════════════════════════════════════════════════════════════
-- scripts/seed-halania-bookings.sql
--
-- One-off seed script — populates Halania Dixon's account with 90 days
-- of plausible booking history (+ 30 days forward) so Phase 9 data-
-- driven UI surfaces (Business Brain charts, dashboard bento, client
-- detail tiles, the upcoming bookings week view) render with meaningful
-- patterns instead of empty states.
--
-- WHAT IT GENERATES (per the task brief, 2026-05-12):
--   · 90 days back + 30 days forward of bookings (~150-250 total)
--   · 70%-ish of days active. Weekdays heavier, Saturday slightly
--     heavy, Sunday quietest.
--   · 80% of bookings clustered 9am-7pm in pro tz; 20% sprinkled
--     7-9am or 7-9pm (makes the Time-of-day heatmap interesting).
--   · Status mix on past: 75% completed, 10% cancelled, 10% confirmed
--     (recent, hasn't auto-completed yet), 5% cancelled-as-no-show.
--     Schema has no no_show value → encoded as cancelled with
--     cancelled_by='client' + cancel_reason='no_show'.
--   · Future: all confirmed. Today: 2-4 bookings guaranteed so the
--     dashboard hero tile is non-empty.
--   · Services: one used heavily (40% of bookings), others split the
--     remaining 60% — gives Top Earning Services chart shape.
--   · Clients: power-law (3 VIPs ~15-25 bookings each, 7 regulars
--     ~5-10, rest 1-3) — gives Top Clients by LTV + VIP/Regular/New/
--     Inactive auto-tags shape.
--   · Payment mix on completed bookings:
--       25% fully upfront (deposit_paid=false, paid_in_full_at set)
--       25% deposit + balance (both flags set)
--       20% deposit only (deposit_paid=true, paid_in_full_at null)
--       30% no OYRB payment (both null — paid offline)
--   · Timing pings (service_started_at + service_ended_at) on 60%
--     of completed bookings, with small realistic over/under-run vs
--     scheduled — feeds Schedule Accuracy ring + By-Service Timing.
--   · booking_source: 50/50 public_widget vs manual.
--
-- WHAT IT DOES NOT TOUCH:
--   · The "Life as a Lania Renee" business (past-due, irrelevant)
--   · Marketing campaigns, waitlist entries, email opens
--   · Application code (this is pure data)
--   · The schema (no migration)
--
-- HOW TO RUN:
--   Supabase SQL Editor → New query → paste this file → Run.
--   Output: a NOTICE line per major step, then a final summary table.
--
-- IDEMPOTENCY:
--   Per the task brief, marker strategy (c) — Halania has zero real
--   bookings today, so anything in the table will be seed data. The
--   script REFUSES to run if any bookings already exist for this
--   business (safety guard). To re-seed, first wipe:
--
--     delete from public.bookings
--      where business_id = (
--        select id from public.businesses
--         where business_name = 'Halania Dixon'
--      );
--
-- ═════════════════════════════════════════════════════════════════════════

do $$
declare
  v_business_id     uuid;
  v_owner_id        uuid;
  v_tz              text;
  v_now             timestamptz := now();

  -- Service arrays (parallel — index N is the same service across all 3)
  v_service_ids       uuid[];
  v_service_durations int[];
  v_service_prices    int[];
  v_total_services    int;
  v_service_idx       int;
  v_service_id        uuid;
  v_duration          int;
  v_price             int;

  -- Client arrays — tiered for power-law distribution
  v_client_ids        uuid[];
  v_vip_ids           uuid[];
  v_regular_ids       uuid[];
  v_occasional_ids    uuid[];
  v_total_clients     int;
  v_client_id         uuid;

  -- Loop control
  v_day              date;
  v_first_day        date;
  v_last_day         date;
  v_today_local      date;
  v_dow              int;
  v_active_prob      numeric;
  v_count_roll       numeric;
  v_booking_count    int;
  v_idx              int;
  v_bookings_seeded  int := 0;

  -- Per-booking
  v_r_client_tier    numeric;
  v_start_hour       numeric;
  v_minute_of_day    int;
  v_start_at         timestamptz;
  v_end_at           timestamptz;
  v_status           text;
  v_source           text;
  v_created_at       timestamptz;
  v_r_status         numeric;
  v_r_pay            numeric;
  v_has_pings        boolean;
  v_deposit_paid     boolean;
  v_paid_in_full_at  timestamptz;
  v_paid_amount      int;
  v_completed_at     timestamptz;
  v_cancelled_at     timestamptz;
  v_cancelled_by     text;
  v_cancel_reason    text;
  v_svc_started      timestamptz;
  v_svc_ended        timestamptz;
  v_overrun_min      int;
begin
  -- ── 1. Resolve target business ─────────────────────────────────────
  select id, owner_id, coalesce(timezone, 'America/New_York')
    into v_business_id, v_owner_id, v_tz
  from public.businesses
  where business_name = 'Halania Dixon'
  limit 1;

  if v_business_id is null then
    raise exception 'Could not find business "Halania Dixon" — check the business_name spelling';
  end if;

  raise notice '┌─ Seeding Halania Dixon';
  raise notice '│ business_id = %', v_business_id;
  raise notice '│ owner_id    = %', v_owner_id;
  raise notice '│ timezone    = %', v_tz;

  -- ── 2. Safety: refuse to seed if bookings already exist ────────────
  if exists (
    select 1 from public.bookings where business_id = v_business_id limit 1
  ) then
    raise exception 'Halania Dixon already has bookings. To re-seed, first wipe: delete from public.bookings where business_id = %L', v_business_id;
  end if;

  -- ── 3. Load services (ordered by created_at; the FIRST gets 40% ────
  --     usage weight; rest split 60% evenly).
  select array_agg(id        order by created_at),
         array_agg(duration_minutes order by created_at),
         array_agg(price_cents order by created_at)
    into v_service_ids, v_service_durations, v_service_prices
  from public.services
  where business_id = v_business_id and active = true;

  v_total_services := coalesce(array_length(v_service_ids, 1), 0);
  if v_total_services = 0 then
    raise exception 'No active services on Halania Dixon — cannot seed bookings without services';
  end if;
  raise notice '│ services    = % active', v_total_services;

  -- ── 4. Load clients, tier into VIP / regular / occasional ──────────
  --     Power-law: clients ordered by created_at; first 3 are VIPs,
  --     next 7 are regulars, rest are occasional. The booking-pick
  --     loop below biases random selection toward the lower tiers,
  --     so VIPs and regulars accumulate more bookings each.
  select array_agg(id order by created_at)
    into v_client_ids
  from public.clients
  where business_id = v_business_id;

  v_total_clients := coalesce(array_length(v_client_ids, 1), 0);
  if v_total_clients < 5 then
    raise exception 'Need at least 5 clients to seed a realistic distribution; found %', v_total_clients;
  end if;
  raise notice '│ clients     = % total', v_total_clients;

  v_vip_ids        := v_client_ids[1 : least(3, v_total_clients)];
  v_regular_ids    := v_client_ids[(least(3, v_total_clients) + 1) : least(10, v_total_clients)];
  if v_total_clients > 10 then
    v_occasional_ids := v_client_ids[11 : v_total_clients];
  else
    v_occasional_ids := array[]::uuid[];
  end if;

  raise notice '│   VIPs       = % clients', coalesce(array_length(v_vip_ids, 1), 0);
  raise notice '│   Regulars   = % clients', coalesce(array_length(v_regular_ids, 1), 0);
  raise notice '│   Occasional = % clients', coalesce(array_length(v_occasional_ids, 1), 0);

  -- ── 5. Day window: 90 days back, 30 days forward, in pro tz ────────
  v_today_local := (v_now at time zone v_tz)::date;
  v_first_day   := v_today_local - 90;
  v_last_day    := v_today_local + 30;
  v_day         := v_first_day;

  raise notice '│ window      = % → %', v_first_day, v_last_day;

  -- ── 6. Main loop: day by day, generate bookings ────────────────────
  while v_day <= v_last_day loop
    v_dow := extract(dow from v_day)::int;  -- 0=Sun..6=Sat

    -- Active-day probability by weekday
    v_active_prob := case
      when v_dow = 0 then 0.40   -- Sunday — quietest
      when v_dow = 6 then 0.65   -- Saturday — slightly heavy
      else 0.80                  -- Mon-Fri — heavy
    end;

    -- Today gets a guaranteed 2-4 bookings (per task brief) so the
    -- dashboard hero tile + Hero block is meaningful on demo.
    if v_day = v_today_local then
      v_booking_count := 2 + floor(random() * 3)::int;  -- 2-4
    elsif random() < v_active_prob then
      -- Bookings on active day: weighted bucket
      v_count_roll := random();
      v_booking_count := case
        when v_count_roll < 0.60 then 2 + floor(random() * 3)::int  -- 2-4
        when v_count_roll < 0.85 then 5 + floor(random() * 4)::int  -- 5-8
        else 1
      end;
    else
      v_booking_count := 0;  -- day off
    end if;

    -- Loop bookings on this day
    for v_idx in 1..v_booking_count loop
      -- Service pick: first service 40% probability, rest split
      if random() < 0.40 or v_total_services = 1 then
        v_service_idx := 1;
      else
        v_service_idx := 2 + floor(random() * (v_total_services - 1))::int;
        if v_service_idx > v_total_services then
          v_service_idx := v_total_services;
        end if;
      end if;
      v_service_id := v_service_ids[v_service_idx];
      v_duration   := v_service_durations[v_service_idx];
      v_price      := v_service_prices[v_service_idx];

      -- Client pick by tier (power-law)
      v_r_client_tier := random();
      if v_r_client_tier < 0.45 and array_length(v_vip_ids, 1) > 0 then
        -- 45% of bookings → VIPs (concentrates LTV on top 3)
        v_client_id := v_vip_ids[1 + floor(random() * array_length(v_vip_ids, 1))::int];
      elsif v_r_client_tier < 0.80 and array_length(v_regular_ids, 1) > 0 then
        -- 35% → Regulars
        v_client_id := v_regular_ids[1 + floor(random() * array_length(v_regular_ids, 1))::int];
      elsif array_length(v_occasional_ids, 1) > 0 then
        -- 20% → Occasional
        v_client_id := v_occasional_ids[1 + floor(random() * array_length(v_occasional_ids, 1))::int];
      else
        -- Fallback: regulars (small client base)
        v_client_id := v_regular_ids[1 + floor(random() * array_length(v_regular_ids, 1))::int];
      end if;

      -- Time of day: 80% cluster 9am-7pm, 20% outliers 7-9am or 7-9pm
      if random() < 0.80 then
        v_start_hour := 9 + random() * 10;  -- [9, 19)
      else
        if random() < 0.5 then
          v_start_hour := 7 + random() * 2;   -- [7, 9)
        else
          v_start_hour := 19 + random() * 2;  -- [19, 21)
        end if;
      end if;

      -- Snap to nearest 15-minute slot for realism
      v_minute_of_day := round(v_start_hour * 4) * 15;

      -- Convert (local day, local minute-of-day) → UTC instant via tz
      v_start_at := ((v_day::timestamp + make_interval(mins => v_minute_of_day))
                     at time zone v_tz);
      v_end_at   := v_start_at + make_interval(mins => v_duration);

      -- Status: future = confirmed, past = mixed
      if v_start_at > v_now then
        v_status := 'confirmed';
        v_completed_at  := null;
        v_cancelled_at  := null;
        v_cancelled_by  := null;
        v_cancel_reason := null;
      else
        v_r_status := random();
        if v_r_status < 0.75 then
          v_status := 'completed';
          v_completed_at  := v_end_at + interval '4 hours';
          v_cancelled_at  := null;
          v_cancelled_by  := null;
          v_cancel_reason := null;
        elsif v_r_status < 0.85 then
          v_status := 'cancelled';
          v_completed_at := null;
          -- Cancelled some hours before the appointment was scheduled to start
          v_cancelled_at := v_start_at - make_interval(hours => 1 + floor(random() * 48)::int);
          v_cancelled_by := case when random() < 0.6 then 'client' else 'pro' end;
          v_cancel_reason := case when random() < 0.4 then 'schedule conflict' else null end;
        elsif v_r_status < 0.95 then
          -- Recent past, hasn't auto-completed yet
          v_status := 'confirmed';
          v_completed_at  := null;
          v_cancelled_at  := null;
          v_cancelled_by  := null;
          v_cancel_reason := null;
        else
          -- "no_show" allocation — schema has no such status; record as
          -- cancelled-by-client with cancel_reason='no_show' so the
          -- intent is recoverable, and revenue still gets excluded
          -- via the existing != 'cancelled' filters.
          v_status := 'cancelled';
          v_completed_at  := null;
          v_cancelled_at  := v_end_at + interval '1 hour';  -- discovered post-appointment
          v_cancelled_by  := 'client';
          v_cancel_reason := 'no_show';
        end if;
      end if;

      -- Payment mix on completed bookings only
      v_deposit_paid    := false;
      v_paid_in_full_at := null;
      v_paid_amount     := null;
      if v_status = 'completed' then
        v_r_pay := random();
        if v_r_pay < 0.25 then
          -- Fully upfront
          v_deposit_paid    := false;
          v_paid_in_full_at := v_start_at - interval '1 day';
          v_paid_amount     := v_price;
        elsif v_r_pay < 0.50 then
          -- Deposit + balance (paid_amount_cents=full price is a seed
          -- approximation; mig 020 says it's technically the balance
          -- only, but for visualization purposes the totals net out)
          v_deposit_paid    := true;
          v_paid_in_full_at := v_start_at - interval '2 hours';
          v_paid_amount     := v_price;
        elsif v_r_pay < 0.70 then
          -- Deposit only — balance paid offline
          v_deposit_paid    := true;
          v_paid_in_full_at := null;
          v_paid_amount     := null;
        else
          -- No OYRB payment
          v_deposit_paid    := false;
          v_paid_in_full_at := null;
          v_paid_amount     := null;
        end if;
      elsif v_status = 'confirmed' and v_start_at > v_now then
        -- Some future bookings paid the deposit
        if random() < 0.35 then
          v_deposit_paid := true;
        end if;
      end if;

      -- Timing pings on 60% of completed bookings — drives Schedule
      -- Accuracy ring + By-Service Timing card on the Time tab.
      v_svc_started := null;
      v_svc_ended   := null;
      if v_status = 'completed' and random() < 0.60 then
        -- Started 0-3 minutes after scheduled start (pros run a few min late)
        v_svc_started := v_start_at + make_interval(mins => floor(random() * 4)::int);
        -- Overrun distribution: mostly within ±10 min, occasional bigger swing
        v_overrun_min := case
          when random() < 0.70 then floor(random() * 21)::int - 10   -- -10 .. +10
          when random() < 0.90 then floor(random() * 21)::int + 5    -- +5 .. +25
          else floor(random() * 16)::int - 20                        -- -20 .. -5 (efficient)
        end;
        v_svc_ended := v_end_at + make_interval(mins => v_overrun_min);
      end if;

      -- Source: 50/50 public_widget / manual
      v_source := case when random() < 0.5 then 'public_widget' else 'manual' end;

      -- created_at: 1-7 days before start_at, clamped to <= now()
      v_created_at := least(
        v_start_at - make_interval(days => 1 + floor(random() * 7)::int),
        v_now
      );

      -- ── INSERT ─────────────────────────────────────────────────────
      insert into public.bookings (
        business_id, client_id, service_id,
        start_at, end_at, status, booking_source,
        created_at, completed_at,
        cancelled_at, cancelled_by, cancel_reason,
        service_started_at, service_ended_at,
        deposit_paid, paid_in_full_at, paid_amount_cents
      ) values (
        v_business_id, v_client_id, v_service_id,
        v_start_at, v_end_at, v_status, v_source,
        v_created_at, v_completed_at,
        v_cancelled_at, v_cancelled_by, v_cancel_reason,
        v_svc_started, v_svc_ended,
        v_deposit_paid, v_paid_in_full_at, v_paid_amount
      );

      v_bookings_seeded := v_bookings_seeded + 1;
    end loop;

    v_day := v_day + 1;
  end loop;

  raise notice '│';
  raise notice '│ seeded % bookings', v_bookings_seeded;
  raise notice '└──';
end $$;

-- ── Summary ────────────────────────────────────────────────────────────
-- Run this read-only block to see the shape of what just got seeded.
-- Paste it into a fresh query cell if you want to re-check at any time.

with target as (
  select id from public.businesses where business_name = 'Halania Dixon' limit 1
)
select
  status,
  count(*)                                                          as total,
  count(*) filter (where start_at > now())                          as future,
  count(*) filter (where start_at <= now())                         as past,
  count(*) filter (where booking_source = 'public_widget')          as widget,
  count(*) filter (where booking_source = 'manual')                 as manual,
  count(*) filter (where deposit_paid)                              as deposit_paid,
  count(*) filter (where paid_in_full_at is not null)               as paid_in_full,
  count(*) filter (where service_started_at is not null)            as has_start_ping,
  count(*) filter (where service_ended_at is not null)              as has_end_ping
from public.bookings, target
where bookings.business_id = target.id
group by status
order by status;
