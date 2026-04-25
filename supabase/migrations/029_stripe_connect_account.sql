-- ═════════════════════════════════════════════════════════════════════════
-- 029 — Stripe Connect (Standard) account linkage on businesses
--
-- Every pro that wants to take payments from their clients gets their own
-- Stripe Account, fully owned by them (Standard mode). OYRB just stores a
-- pointer to it (acct_…) plus a few status flags Stripe tells us during
-- onboarding so the app can gate features without round-tripping to
-- Stripe on every request.
--
-- All columns are nullable / default false so this is safe to run on a
-- live table with existing rows — no backfill needed.
--
--   stripe_connect_account_id              acct_… returned by accounts.create
--   stripe_connect_onboarding_complete     local rollup of "the link expired
--                                          and Stripe says they're done"
--   stripe_connect_charges_enabled         from account.charges_enabled —
--                                          true when Stripe will accept
--                                          new charges on this account
--   stripe_connect_payouts_enabled         from account.payouts_enabled —
--                                          true when Stripe will pay them
--                                          out to their bank
--   stripe_connect_details_submitted       from account.details_submitted —
--                                          true once they finish all KYC
--   stripe_connect_requirements_currently_due
--                                          jsonb mirror of
--                                          account.requirements.currently_due
--                                          so the dashboard can tell the pro
--                                          "Stripe still needs your SSN"
-- ═════════════════════════════════════════════════════════════════════════

alter table public.businesses
  add column if not exists stripe_connect_account_id text,
  add column if not exists stripe_connect_onboarding_complete boolean not null default false,
  add column if not exists stripe_connect_charges_enabled boolean not null default false,
  add column if not exists stripe_connect_payouts_enabled boolean not null default false,
  add column if not exists stripe_connect_details_submitted boolean not null default false,
  add column if not exists stripe_connect_requirements_currently_due jsonb;

-- One Stripe Account can only be linked to one business. UNIQUE on a
-- nullable text column still allows many NULLs (each unconnected business
-- stays NULL), which is exactly what we want.
create unique index if not exists businesses_stripe_connect_account_id_uidx
  on public.businesses (stripe_connect_account_id)
  where stripe_connect_account_id is not null;
