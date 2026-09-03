-- Redemption-code unlock matrix for migrations 062 + 063. Rollback-safe.
--
-- The whole unlock transaction lives in public.redeem_template_code(); the
-- route only does auth + the pre-checks. So this exercises the function
-- directly against real rows:
--   1. valid redeem            -> 'ok', unlock + audit row created, count++
--   2. already-redeemed        -> 'already_redeemed', no second unlock, count unchanged
--   3. second business, same unlimited code -> 'ok' (external_order_id is per-business)
--   4. capped code retry       -> 'already_redeemed', no second unlock, count unchanged
--   5. exhausted code          -> 'exhausted', no unlock, count unchanged
--   6. inactive code           -> 'not_found'
-- The no-business (409) guard is enforced in the route, not the function.

begin;

create temp table redemption_results (
  test_name text,
  pass boolean,
  detail text
) on commit drop;

do $$
declare
  owner_id uuid;
  biz_a uuid;
  biz_b uuid;
  code_unlimited uuid;
  code_single_use uuid;
  code_capped uuid;
  code_inactive uuid;
  r record;
  unlock_count integer;
  audit_count integer;
  count_after integer;
begin
  select id into owner_id from public.profiles order by created_at asc limit 1;
  if owner_id is null then
    raise exception 'No profile available for test owner';
  end if;

  insert into public.businesses (owner_id, business_name, slug, is_published)
  values (owner_id, 'Redeem Test A',
          'redeem-test-a-' || replace(gen_random_uuid()::text, '-', ''), true)
  returning id into biz_a;
  insert into public.businesses (owner_id, business_name, slug, is_published)
  values (owner_id, 'Redeem Test B',
          'redeem-test-b-' || replace(gen_random_uuid()::text, '-', ''), true)
  returning id into biz_b;

  insert into public.template_redemption_codes (code, layout_id, theme_id, max_redemptions, active)
  values ('TEST-UNLIMITED-' || replace(gen_random_uuid()::text, '-', ''), 'luxe', 'chrome', null, true)
  returning id into code_unlimited;

  insert into public.template_redemption_codes (code, layout_id, theme_id, max_redemptions, active)
  values ('TEST-SINGLE-USE-' || replace(gen_random_uuid()::text, '-', ''), 'luxe', 'galactic', 1, true)
  returning id into code_single_use;

  insert into public.template_redemption_codes (code, layout_id, theme_id, max_redemptions, redemption_count, active)
  values ('TEST-CAPPED-' || replace(gen_random_uuid()::text, '-', ''), 'luxe', 'noir', 1, 1, true)
  returning id into code_capped;

  insert into public.template_redemption_codes (code, layout_id, theme_id, max_redemptions, active)
  values ('TEST-INACTIVE-' || replace(gen_random_uuid()::text, '-', ''), 'luxe', 'slate', null, false)
  returning id into code_inactive;

  -- 1. valid redeem
  select * into r from public.redeem_template_code(code_unlimited, owner_id, biz_a);
  select count(*) into unlock_count from public.template_unlocks
    where business_id = biz_a and theme_id = 'chrome' and source = 'redemption';
  select count(*) into audit_count from public.template_redemptions
    where code_id = code_unlimited and business_id = biz_a;
  select redemption_count into count_after from public.template_redemption_codes where id = code_unlimited;
  insert into redemption_results values (
    'valid redeem',
    r.out_status = 'ok' and unlock_count = 1 and audit_count = 1 and count_after = 1,
    format('status=%s unlocks=%s audit=%s count=%s', r.out_status, unlock_count, audit_count, count_after)
  );

  -- 2. already-redeemed idempotency
  select * into r from public.redeem_template_code(code_unlimited, owner_id, biz_a);
  select count(*) into unlock_count from public.template_unlocks
    where business_id = biz_a and theme_id = 'chrome' and source = 'redemption';
  select redemption_count into count_after from public.template_redemption_codes where id = code_unlimited;
  insert into redemption_results values (
    'already-redeemed idempotency',
    r.out_status = 'already_redeemed' and unlock_count = 1 and count_after = 1,
    format('status=%s unlocks=%s count=%s', r.out_status, unlock_count, count_after)
  );

  -- 3. second business redeems the same unlimited code
  select * into r from public.redeem_template_code(code_unlimited, owner_id, biz_b);
  select count(*) into unlock_count from public.template_unlocks
    where business_id = biz_b and theme_id = 'chrome' and source = 'redemption';
  select redemption_count into count_after from public.template_redemption_codes where id = code_unlimited;
  insert into redemption_results values (
    'second business, same code',
    r.out_status = 'ok' and unlock_count = 1 and count_after = 2,
    format('status=%s unlocks=%s count=%s', r.out_status, unlock_count, count_after)
  );

  -- 4. capped code retry must still be idempotent after the cap is reached.
  select * into r from public.redeem_template_code(code_single_use, owner_id, biz_a);
  select * into r from public.redeem_template_code(code_single_use, owner_id, biz_a);
  select count(*) into unlock_count from public.template_unlocks
    where business_id = biz_a and theme_id = 'galactic' and source = 'redemption';
  select redemption_count into count_after from public.template_redemption_codes where id = code_single_use;
  insert into redemption_results values (
    'capped code retry stays idempotent',
    r.out_status = 'already_redeemed' and unlock_count = 1 and count_after = 1,
    format('status=%s unlocks=%s count=%s', r.out_status, unlock_count, count_after)
  );

  -- 5. exhausted code
  select * into r from public.redeem_template_code(code_capped, owner_id, biz_a);
  select count(*) into unlock_count from public.template_unlocks
    where business_id = biz_a and theme_id = 'noir';
  select redemption_count into count_after from public.template_redemption_codes where id = code_capped;
  insert into redemption_results values (
    'exhausted code',
    r.out_status = 'exhausted' and unlock_count = 0 and count_after = 1,
    format('status=%s unlocks=%s count=%s', r.out_status, unlock_count, count_after)
  );

  -- 6. inactive code
  select * into r from public.redeem_template_code(code_inactive, owner_id, biz_a);
  select count(*) into unlock_count from public.template_unlocks
    where business_id = biz_a and theme_id = 'slate';
  insert into redemption_results values (
    'inactive code',
    r.out_status = 'not_found' and unlock_count = 0,
    format('status=%s unlocks=%s', r.out_status, unlock_count)
  );
end $$;

select test_name, pass, detail from redemption_results order by test_name;

do $$
declare
  failed integer;
begin
  select count(*) into failed from redemption_results where not pass;
  if failed > 0 then
    raise exception '% redemption matrix test(s) failed', failed;
  end if;
end $$;

rollback;
