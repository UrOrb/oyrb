-- 034 - Subscription payment-failure lifecycle (Phase 1.2)
-- Adds the timestamp columns needed for the grace-period flow:
--
--   account_subscriptions.past_due_since        — first time Stripe flagged
--                                                  the row as past_due in
--                                                  the current failure
--                                                  cycle. NULL when healthy;
--                                                  cleared on recovery.
--   account_subscriptions.grace_period_ends_at  — past_due_since + 2 days.
--                                                  Storefront stays live
--                                                  until this passes.
--   account_subscriptions.last_warning_sent_at  — dedup anchor for the
--                                                  cron-driven warning
--                                                  emails (T-3 pre-billing,
--                                                  T+1 grace-expiring).
--
--   businesses.unpublished_for_billing_at       — set by the enforcement
--                                                  cron when it auto-flips
--                                                  is_published=false due
--                                                  to expired grace.
--                                                  Cleared on recovery so
--                                                  the storefront re-
--                                                  publishes automatically.
--                                                  Mirrors the existing
--                                                  archived_at pattern in
--                                                  the same table — a
--                                                  single-purpose marker
--                                                  the pro's manual
--                                                  is_published toggle
--                                                  never touches.

alter table public.account_subscriptions
  add column if not exists past_due_since        timestamptz,
  add column if not exists grace_period_ends_at  timestamptz,
  add column if not exists last_warning_sent_at  timestamptz;

-- Cron query support — finds past_due subscriptions whose grace window has
-- elapsed (enforcement step) and those still inside it (T+1 warnings).
create index if not exists idx_account_sub_grace_window
  on public.account_subscriptions(status, grace_period_ends_at)
  where status = 'past_due';

alter table public.businesses
  add column if not exists unpublished_for_billing_at timestamptz;

-- Used by the recovery path on invoice.payment_succeeded — re-publishes
-- only the businesses the cron itself paused.
create index if not exists idx_businesses_unpublished_for_billing
  on public.businesses(owner_id)
  where unpublished_for_billing_at is not null;
