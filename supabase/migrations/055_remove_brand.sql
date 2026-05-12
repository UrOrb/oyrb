-- 055 - Remove Brand grace-period flow (Phase 8 PR 4 of 5)
--
-- Pros can initiate a 14-day removal from /dashboard/settings/remove-brand.
-- This migration adds the state columns + a per-event audit table.
-- The cron job that finalizes the removal (cascade-delete + auth.users
-- removal) lands in Phase 8 PR 5; this PR only sets up entry/exit.
--
-- ── State columns on businesses ──────────────────────────────────────
-- Mirror the single-purpose timestamp convention from migrations
-- 034 (unpublished_for_billing_at) and 041 (strike_paused_at): one
-- column per state-reason, NULL when not in that state. The
-- removal_* columns reflect the MOST RECENT removal initiation;
-- cycle history (initiate → restore → re-initiate) is preserved in
-- business_removal_events below.
--
-- Audit columns mirror the consent-affirmation columns from
-- migration 053:
--   removal_initiated_by_user_id   ON DELETE RESTRICT — compliance
--                                   evidence must persist if the
--                                   auth.users row is removed by
--                                   other means.
--   removal_confirmation_version    integer, monotonically bumped
--                                   when src/lib/remove-brand/
--                                   confirmation-copy.ts changes
--                                   its CONFIRMATION_COPY_VERSION
--                                   constant. Same numeric-version
--                                   convention as mig 053.
--
-- removal_scheduled_for is materialized at write time
-- (= removal_initiated_at + removal_grace_period_days * interval '1 day')
-- so the PR 5 cron can run `where removal_scheduled_for < now()`
-- without recomputing.
--
-- removal_grace_period_days is captured per-removal (not pulled
-- from a global default at cron time). Future changes to the
-- platform default won't retroactively shorten or extend in-flight
-- grace windows.
--
-- removal_pre_initiation_is_published / _is_listed snapshot the
-- pre-initiation visibility flags so restoreRemoval (and the PR 5
-- admin-cancel path) can revert to the EXACT prior state. Pros who
-- had is_published=false before initiating (intentionally private
-- drafting) do NOT get republished on restore — that would be
-- hostile. Cleared to NULL on restore.

alter table public.businesses
  add column if not exists removal_initiated_at                  timestamptz,
  add column if not exists removal_initiated_by_user_id          uuid
    references auth.users(id) on delete restrict,
  add column if not exists removal_scheduled_for                 timestamptz,
  add column if not exists removal_grace_period_days             integer,
  add column if not exists removal_initiated_ip                  inet,
  add column if not exists removal_initiated_user_agent          text,
  add column if not exists removal_confirmation_version          integer,
  add column if not exists removal_pre_initiation_is_published   boolean,
  add column if not exists removal_pre_initiation_is_listed      boolean;

-- Cron sweep path (PR 5): "find all businesses whose grace has
-- elapsed." Partial index over the in-grace rows keeps the scan
-- tight even as the businesses table grows.
create index if not exists idx_businesses_removal_scheduled
  on public.businesses (removal_scheduled_for)
  where removal_initiated_at is not null;

-- Owner-side lookup for the dashboard layout banner: "does this user
-- own any in-grace business?" Same shape as the strike-pause and
-- billing-pause owner indexes from migrations 034 and 041.
create index if not exists idx_businesses_owner_removal
  on public.businesses (owner_id)
  where removal_initiated_at is not null;


-- ── Event log: business_removal_events ───────────────────────────────
-- Append-only audit trail of every initiate / restore / finalize /
-- admin-cancel event. Single-purpose columns on `businesses` reflect
-- the CURRENT state of the most recent initiation; this table holds
-- the cycle history.
--
-- Same shape as stripe_connect_events (mig 030) and data_exports
-- (mig 054): pro-read-own RLS; writes service-role only (via
-- createAdminClient from the server actions). No public INSERT
-- policy by design.

create table if not exists public.business_removal_events (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  -- Free-text-with-check: append a new variant in code first, then
  -- update the check constraint. 'finalized' is reserved for PR 5
  -- (cron-driven cascade-delete completes); 'cancelled_by_admin' is
  -- reserved for the admin escape hatch (may land in PR 5).
  event_type    text not null check (
    event_type in ('initiated','restored','finalized','cancelled_by_admin')
  ),
  -- The user who triggered the event. NULL when the event is
  -- system-driven (cron finalizing a long-elapsed initiation; the
  -- pro who initiated may no longer exist by the time the cron
  -- runs). ON DELETE RESTRICT mirrors the audit-actor convention.
  actor_user_id uuid references auth.users(id) on delete restrict,
  ip            inet,
  user_agent    text,
  -- Pinned at event time so we can answer "was this initiation
  -- against the v1 copy or the v2 copy?" without parsing a text
  -- version string. Matches consent_affirmation_version (mig 053).
  copy_version  integer,
  occurred_at   timestamptz not null default now()
);

create index if not exists idx_removal_events_business
  on public.business_removal_events (business_id, occurred_at desc);

alter table public.business_removal_events enable row level security;

drop policy if exists "pros read own removal events" on public.business_removal_events;
create policy "pros read own removal events"
  on public.business_removal_events for select using (
    business_id in (
      select id from public.businesses where owner_id = auth.uid()
    )
  );
-- INSERTs/UPDATEs/DELETEs are service-role only. No policy means
-- no anon/authenticated write path. Service role bypasses RLS and
-- writes via createAdminClient() from the initiateRemoval /
-- restoreRemoval server actions.
