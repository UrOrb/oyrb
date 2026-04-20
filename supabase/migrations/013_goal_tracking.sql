-- ═════════════════════════════════════════════════════════════════════════
-- 013 — Monthly income goal meter
--
-- Adds:
--   · user_goal_settings  (one row per user; their goal config)
--   · goal_history        (monthly snapshots of goal vs. earned)
--
-- Both enforce RLS so users only read/write their own rows.
-- ═════════════════════════════════════════════════════════════════════════

create table if not exists public.user_goal_settings (
  user_id                uuid primary key references auth.users(id) on delete cascade,
  monthly_goal_amount    numeric(10, 2) not null default 0,     -- dollars (not cents) — user-facing input
  count_type             text not null default 'confirmed_bookings'
                         check (count_type in ('confirmed_bookings', 'completed_appointments', 'deposits_received')),
  custom_title           text,
  show_on_dashboard      boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table public.user_goal_settings enable row level security;

create policy "users read own goal settings"
  on public.user_goal_settings for select
  using (user_id = auth.uid());

create policy "users update own goal settings"
  on public.user_goal_settings for update
  using (user_id = auth.uid());

create policy "users insert own goal settings"
  on public.user_goal_settings for insert
  with check (user_id = auth.uid());

-- Monthly snapshot of the user's goal vs. what they earned. One row per
-- (user_id, month). `month` is the first day of the month, UTC.
create table if not exists public.goal_history (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  month             date not null,                    -- first day of that calendar month (UTC)
  goal_amount       numeric(10, 2) not null default 0,
  earned_amount     numeric(10, 2) not null default 0,
  percent_hit       numeric(6, 2) generated always as (
                      case when goal_amount > 0 then round((earned_amount / goal_amount) * 100, 2)
                           else 0 end
                    ) stored,
  count_type        text not null,
  created_at        timestamptz not null default now(),
  unique(user_id, month)
);

alter table public.goal_history enable row level security;

create policy "users read own goal history"
  on public.goal_history for select
  using (user_id = auth.uid());

-- Inserts happen via the monthly-reset cron (service role), never directly
-- by users — so no insert policy for normal users. Service role bypasses RLS.

create index if not exists goal_history_user_month_idx
  on public.goal_history(user_id, month desc);
