-- ═════════════════════════════════════════════════════════════════════
-- finalization-fixture.sql — Phase 8 PR 5 local cron verification
-- ═════════════════════════════════════════════════════════════════════
--
-- Seeds a complete throwaway test business with cascade-relevant
-- child rows so a local run of /api/cron/finalize-removals exercises
-- every step of finalize.ts:
--
--   1. business + owner auth user
--   2. services (cascade via business_id)
--   3. clients (cascade via business_id)
--   4. bookings — confirmed past + cancelled (cascade via business_id;
--      also tests services.id ON DELETE SET NULL is respected if we
--      ever order incorrectly)
--   5. gift_cards (cascade via business_id)
--   6. client_imports row with a source_path the cron should collect
--      and remove from the client-imports bucket
--   7. dispute_inquiries row with evidence_paths jsonb the cron should
--      collect and remove from the dispute-evidence bucket
--   8. business_removal_events row event_type='initiated' (mimics what
--      PR 4's initiateRemoval action wrote 15 days ago)
--   9. removal_scheduled_for set to NOW() - 1 day so the cron sweep
--      picks it up
--  10. directory_listings row with is_listed=false (the PR 4 initiate
--      action would have flipped this; restore would flip it back)
--
-- HOW TO RUN — local:
--
--   1. supabase start  (or otherwise have a local Postgres + Storage)
--   2. (optional) Upload a placeholder file or two into each storage
--      bucket at the paths this fixture references — gives the cron
--      something real to remove. Without it, the Storage steps log
--      "no files to remove" but the DB cascades still happen.
--      Paths:
--        photos / bookings/<business_id>/test.jpg
--        photos / <owner_id>/profile.jpg
--        client-imports / <owner_id>/imports/<import_id>/source.csv
--        dispute-evidence / <business_id>/<dispute_id>/evidence.pdf
--   3. psql ... -f tests/finalization-fixture.sql
--   4. NEXT_PUBLIC_APP_URL=... CRON_SECRET=... pnpm dev
--   5. curl -H "Authorization: Bearer $CRON_SECRET" \
--        http://localhost:3000/api/cron/finalize-removals
--
-- POST-CRON VERIFICATION — run after step 5:
--
--   A. select * from businesses where id = '<test_business_id>';
--      → expect 0 rows (business is gone)
--   B. select * from business_removal_events
--        where event_type = 'finalized' and copy_version is not null;
--      → expect 1 row, business_id = NULL (mig 056 SET NULL preserved
--        the audit while wiping the FK reference)
--   C. select count(*) from services where business_id = '<test_business_id>';
--      → expect 0 (cascade)
--   D. select count(*) from bookings where business_id = '<test_business_id>';
--      → expect 0 (cascade)
--   E. select count(*) from client_imports where business_id = '<test_business_id>';
--      → expect 0 (cascade)
--   F. select count(*) from dispute_inquiries where business_id = '<test_business_id>';
--      → expect 0 (cascade)
--   G. (Storage) the four bucket prefixes from step 2 above should be
--      empty if you uploaded placeholders. If the buckets show empty
--      already, that's because you didn't upload — still a valid run.
--   H. (Email) check the Resend dashboard for the
--      "Your brand ... has been removed" send to the test pro's email.
--   I. select id from auth.users where id = '<test_owner_id>';
--      → expect 0 rows (last-business → auth.users deleted)
--
-- CLEANUP IF CRON DIDN'T RUN OR FAILED MID-FLIGHT:
--
--   delete from auth.users where id = '<test_owner_id>';
--   -- cascades the business row + everything else.
--
-- ═════════════════════════════════════════════════════════════════════

-- Stable test ids so the verification queries above stay copy/pasteable
-- across runs. Re-running this fixture errors on duplicates (intentional —
-- run cleanup first if you want a fresh seed).

do $$
declare
  v_owner_id  uuid := '00000000-0000-0000-0000-000000000F01';
  v_biz_id    uuid := '00000000-0000-0000-0000-000000000F02';
  v_svc_id    uuid := '00000000-0000-0000-0000-000000000F03';
  v_client_id uuid := '00000000-0000-0000-0000-000000000F04';
  v_booking1  uuid := '00000000-0000-0000-0000-000000000F05';
  v_booking2  uuid := '00000000-0000-0000-0000-000000000F06';
  v_giftcard  uuid := '00000000-0000-0000-0000-000000000F07';
  v_import_id uuid := '00000000-0000-0000-0000-000000000F08';
  v_dispute   uuid := '00000000-0000-0000-0000-000000000F09';
  v_event_init uuid := '00000000-0000-0000-0000-000000000F0A';
  -- Pin the times so verification has predictable values
  v_now       timestamptz := now();
  v_initiated timestamptz := now() - interval '15 days';
  v_scheduled timestamptz := now() - interval '1 day';
begin
  -- 1. auth.users (owner) — created via auth.admin in real flow; for
  --    local testing we insert directly. Email is fake.
  insert into auth.users (id, email, created_at, updated_at)
  values (
    v_owner_id,
    'test-finalize@oyrb.local',
    v_now - interval '60 days',
    v_now - interval '60 days'
  );

  -- 2. businesses (in-grace state — what PR 4 initiateRemoval leaves)
  insert into public.businesses (
    id, owner_id, business_name, slug, is_published, timezone,
    service_category, template_layout, template_theme,
    pass_the_torch_enabled, pass_the_torch_visibility,
    primary_specialty, subscription_tier, contact_email,
    stripe_customer_id, stripe_subscription_id, stripe_connect_account_id,
    -- Remove Brand state (mig 055)
    removal_initiated_at, removal_initiated_by_user_id,
    removal_scheduled_for, removal_grace_period_days,
    removal_initiated_ip, removal_initiated_user_agent,
    removal_confirmation_version,
    removal_pre_initiation_is_published, removal_pre_initiation_is_listed,
    created_at
  ) values (
    v_biz_id, v_owner_id, 'Finalize Fixture Brand', 'finalize-fixture',
    false, 'America/New_York', 'hair', 'studio', 'aura',
    false, 'smart', 'hair', 'starter', 'test-finalize@oyrb.local',
    -- Stripe ids point at nothing real; the cron's catch handles
    -- resource_missing gracefully.
    'cus_test_finalize', 'sub_test_finalize', null,
    v_initiated, v_owner_id, v_scheduled, 14,
    '127.0.0.1'::inet, 'fixture/1.0', 1,
    true, true,
    v_now - interval '60 days'
  );

  -- 3. services
  insert into public.services (id, business_id, name, duration_minutes, price_cents, deposit_cents, active)
  values (v_svc_id, v_biz_id, 'Test Service', 60, 5000, 1000, true);

  -- 4. clients
  insert into public.clients (id, business_id, name, email, phone, created_at)
  values (v_client_id, v_biz_id, 'Test Client', 'test-client@oyrb.local', '+15555550100', v_now - interval '30 days');

  -- 5. bookings — one confirmed past, one cancelled (both still
  --    cascade on business delete; status doesn't matter for cascade)
  insert into public.bookings (id, business_id, client_id, service_id, start_at, end_at, status, deposit_paid, created_at)
  values
    (v_booking1, v_biz_id, v_client_id, v_svc_id, v_now - interval '5 days', v_now - interval '5 days' + interval '1 hour', 'completed', true, v_now - interval '20 days'),
    (v_booking2, v_biz_id, v_client_id, v_svc_id, v_now - interval '2 days', v_now - interval '2 days' + interval '1 hour', 'cancelled', false, v_now - interval '10 days');

  -- 6. gift_cards
  insert into public.gift_cards (id, code, pro_user_id, business_id, amount_cents, purchased_by_email, purchased_at)
  values (v_giftcard, 'TEST-FIXTURE-' || substr(md5(random()::text), 1, 8), v_owner_id, v_biz_id, 5000, 'buyer@oyrb.local', v_now - interval '15 days');

  -- 7. client_imports — source_path is what the cron should remove
  --    from the client-imports bucket
  insert into public.client_imports (id, business_id, initiated_by_user_id, source_path, status, created_at)
  values (v_import_id, v_biz_id, v_owner_id, v_owner_id::text || '/imports/' || v_import_id::text || '/source.csv', 'committed', v_now - interval '40 days');

  -- 8. dispute_inquiries — evidence_paths jsonb is what the cron
  --    should remove from dispute-evidence
  insert into public.dispute_inquiries (
    id, business_id, booking_id, reporter_type, reporter_email,
    reporter_name, category, summary, evidence_paths, status, created_at
  ) values (
    v_dispute, v_biz_id, v_booking1, 'client', 'reporter@oyrb.local',
    'Test Reporter', 'service_quality', 'fixture dispute',
    jsonb_build_array(
      v_biz_id::text || '/' || v_dispute::text || '/evidence.pdf'
    ),
    'open', v_now - interval '7 days'
  );

  -- 9. business_removal_events — the 'initiated' row that PR 4's
  --    initiateRemoval would have written 15 days ago. Verifies the
  --    mig-056 SET NULL preserves this too (not just the finalized
  --    row).
  insert into public.business_removal_events (id, business_id, event_type, actor_user_id, ip, user_agent, copy_version, occurred_at)
  values (v_event_init, v_biz_id, 'initiated', v_owner_id, '127.0.0.1'::inet, 'fixture/1.0', 1, v_initiated);

  -- 10. directory_listings — the PR 4 initiate flipped is_listed to
  --     false. After finalize, this row CASCADES away because mig 014
  --     anchors it to auth.users(user_id) ON DELETE CASCADE — when
  --     auth.users(v_owner_id) is deleted in step 8 of finalize, this
  --     row goes with it.
  insert into public.directory_listings (user_id, slug, is_listed, agreement_version, agreement_accepted_at, created_at, updated_at)
  values (v_owner_id, 'finalize-fixture-pro', false, 1, v_now - interval '50 days', v_now - interval '50 days', v_now);

  raise notice 'Fixture seeded. business_id=% owner_id=% scheduled_for=%', v_biz_id, v_owner_id, v_scheduled;
end $$;
