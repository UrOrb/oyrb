-- Etsy redemption-code template unlock.
--
-- Etsy cannot talk to OYRB directly, so each Etsy listing ships a
-- redemption code. After signup the buyer enters the code in the site
-- builder ("Have an Etsy code? Redeem it"); the server-only endpoint
-- /api/dashboard/redeem-code validates the code and unlocks the exact
-- template for their account by inserting a row into the existing
-- public.template_unlocks table (source = 'redemption').
--
-- Nothing here is writable by the anon/authenticated client. All writes go
-- through the service-role client + the redeem_template_code() function
-- below, exactly like consume_rate_limit() in 058_global_rate_limits.sql.

-- ── Codes ────────────────────────────────────────────────────────────────
-- One row per Etsy listing. Codes are stored uppercase; the endpoint
-- upper-cases and trims user input before lookup. layout_id NULL means the
-- theme unlocks across every layout (rare); otherwise it is one exact
-- layout + theme pair. max_redemptions NULL means unlimited.
create table if not exists public.template_redemption_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  layout_id text,
  theme_id text not null,
  max_redemptions integer,
  redemption_count integer not null default 0,
  active boolean not null default true,
  source text not null default 'redemption',
  created_at timestamptz not null default now()
);

-- ── Redemptions (audit) ──────────────────────────────────────────────────
-- One row per (code, business). The unique constraint makes redeeming
-- idempotent: a second attempt by the same business raises unique_violation
-- and the function returns "already redeemed" with the existing unlock.
create table if not exists public.template_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.template_redemption_codes(id),
  user_id uuid not null,
  business_id uuid not null,
  unlock_id uuid,
  created_at timestamptz not null default now(),
  unique (code_id, business_id)
);

create index if not exists template_redemptions_business_id_idx
  on public.template_redemptions(business_id);
create index if not exists template_redemptions_code_id_idx
  on public.template_redemptions(code_id);

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Codes: no policy at all -> only the service-role client can touch them.
-- Redemptions: owners may read their own audit rows; no insert/update/delete
-- policy, matching template_unlocks in 060.
alter table public.template_redemption_codes enable row level security;
alter table public.template_redemptions enable row level security;

drop policy if exists "Owners can view their redemptions" on public.template_redemptions;
create policy "Owners can view their redemptions" on public.template_redemptions
  for select using (
    auth.uid() = user_id
    and exists (
      select 1 from public.businesses b
      where b.id = template_redemptions.business_id
        and b.owner_id = auth.uid()
    )
  );

-- ── redeem_template_code() ───────────────────────────────────────────────
-- Runs the whole unlock as one transaction. The caller (the redeem-code
-- route) has already: authenticated the user, resolved their business_id,
-- looked the code up, confirmed it is active + not exhausted, and validated
-- (layout_id, theme_id) against the template catalog. This function does
-- the parts that must be atomic:
--
--   * idempotency — if (code_id, business_id) already redeemed, return the
--     existing unlock without touching the count;
--   * atomic claim — increment redemption_count only if still active and
--     under max_redemptions, in a single UPDATE so two concurrent redeems
--     can't both pass an exhausted code;
--   * insert the template_unlocks row (source = 'redemption');
--   * insert the template_redemptions audit row.
--
-- A failure anywhere after the claim rolls the whole function back,
-- including the increment. A race on the final audit insert is caught and
-- the increment is undone.
--
-- out_status: 'ok' | 'already_redeemed' | 'not_found' | 'exhausted'
create or replace function public.redeem_template_code(
  p_code_id uuid,
  p_user_id uuid,
  p_business_id uuid
)
returns table(out_status text, out_unlock_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.template_redemption_codes%rowtype;
  v_redemption public.template_redemptions%rowtype;
  v_unlock_id uuid;
  v_claimed uuid;
  v_order_key text;
begin
  select * into v_code
  from public.template_redemption_codes
  where id = p_code_id;

  if not found or v_code.active is not true then
    out_status := 'not_found';
    out_unlock_id := null;
    return next;
    return;
  end if;

  v_order_key := v_code.code || ':' || p_business_id::text;

  -- Idempotency: this business already redeemed this code.
  select * into v_redemption
  from public.template_redemptions
  where code_id = v_code.id
    and business_id = p_business_id;

  if found then
    v_unlock_id := v_redemption.unlock_id;
    if v_unlock_id is null then
      select tu.id into v_unlock_id
      from public.template_unlocks tu
      where tu.business_id = p_business_id
        and coalesce(tu.layout_id, '__all_layouts__')
              = coalesce(v_code.layout_id, '__all_layouts__')
        and tu.theme_id = v_code.theme_id
      limit 1;
    end if;

    if v_unlock_id is null then
      insert into public.template_unlocks
        (user_id, business_id, layout_id, theme_id, source, external_order_id)
      values
        (p_user_id, p_business_id, v_code.layout_id, v_code.theme_id,
         'redemption', v_order_key)
      on conflict do nothing
      returning id into v_unlock_id;

      if v_unlock_id is null then
        select tu.id into v_unlock_id
        from public.template_unlocks tu
        where tu.business_id = p_business_id
          and coalesce(tu.layout_id, '__all_layouts__')
                = coalesce(v_code.layout_id, '__all_layouts__')
          and tu.theme_id = v_code.theme_id
        limit 1;
      end if;

      update public.template_redemptions
        set unlock_id = v_unlock_id
      where id = v_redemption.id;
    end if;

    out_status := 'already_redeemed';
    out_unlock_id := v_unlock_id;
    return next;
    return;
  end if;

  -- Atomic claim: only succeeds while active and under the cap.
  update public.template_redemption_codes
    set redemption_count = redemption_count + 1
  where id = v_code.id
    and active
    and (max_redemptions is null or redemption_count < max_redemptions)
  returning id into v_claimed;

  if v_claimed is null then
    out_status := 'exhausted';
    out_unlock_id := null;
    return next;
    return;
  end if;

  -- Create (or reuse) the unlock.
  insert into public.template_unlocks
    (user_id, business_id, layout_id, theme_id, source, external_order_id)
  values
    (p_user_id, p_business_id, v_code.layout_id, v_code.theme_id,
     'redemption', v_order_key)
  on conflict do nothing
  returning id into v_unlock_id;

  if v_unlock_id is null then
    select tu.id into v_unlock_id
    from public.template_unlocks tu
    where tu.business_id = p_business_id
      and coalesce(tu.layout_id, '__all_layouts__')
            = coalesce(v_code.layout_id, '__all_layouts__')
      and tu.theme_id = v_code.theme_id
    limit 1;
  end if;

  -- Audit row. A concurrent redeem for the same (code, business) trips the
  -- unique constraint here; treat it as an idempotent hit and undo our
  -- increment so the count stays truthful.
  begin
    insert into public.template_redemptions
      (code_id, user_id, business_id, unlock_id)
    values
      (v_code.id, p_user_id, p_business_id, v_unlock_id);
  exception when unique_violation then
    update public.template_redemption_codes
      set redemption_count = greatest(redemption_count - 1, 0)
    where id = v_code.id;
    out_status := 'already_redeemed';
    out_unlock_id := v_unlock_id;
    return next;
    return;
  end;

  out_status := 'ok';
  out_unlock_id := v_unlock_id;
  return next;
end;
$$;

comment on function public.redeem_template_code(uuid, uuid, uuid) is
  'Atomically unlocks a template for a business from a redemption code. Idempotent per (code, business).';

-- This security-definer function accepts user_id/business_id arguments, so it
-- must never be callable directly by anon/authenticated clients. The API route
-- invokes it through the service-role client after authenticating the user and
-- resolving their active business server-side.
revoke all on function public.redeem_template_code(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.redeem_template_code(uuid, uuid, uuid)
  to service_role;
