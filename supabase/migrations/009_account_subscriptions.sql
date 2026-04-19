-- Per-account subscription state. One row per user. The account holds the
-- single Stripe subscription that bundles the base plan + N add-on items.
-- `addon_count` mirrors the quantity of the add-on line item on the
-- subscription; the total site allowance = TIERS[tier].sites_included +
-- addon_count, capped by TIERS[tier].site_cap (see src/lib/plans.ts).

create table if not exists account_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null check (tier in ('starter','studio','scale')),
  billing_cycle text not null check (billing_cycle in ('monthly','annual')),
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  stripe_addon_item_id text,                  -- the line item carrying the addon price; null until the user buys an add-on
  addon_count int not null default 0 check (addon_count >= 0),
  status text not null default 'active' check (status in ('active','trialing','past_due','cancelled','incomplete')),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_account_sub_customer
  on account_subscriptions(stripe_customer_id);

alter table account_subscriptions enable row level security;

-- Users can read their own subscription. Writes go through the service role
-- (webhook handlers + server actions only) — no public update policy.
drop policy if exists "Users read own subscription" on account_subscriptions;
create policy "Users read own subscription"
  on account_subscriptions for select
  using (user_id = auth.uid());

-- Soft-archive flag on businesses so a cancelled subscription doesn't delete
-- a user's data — they get it back on resubscribe.
alter table businesses
  add column if not exists archived_at timestamptz;
