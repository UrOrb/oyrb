-- Trial eligibility, abuse detection, and audit log.
--
-- Three tables:
--   trial_history          One row per (email | phone) that has ever
--                          started a trial. Lookups are case-insensitive
--                          on email and exact on phone (E.164).
--   trial_ban_list         Emails / phones permanently barred from any
--                          future trial. Bans are explicit (not derived);
--                          a separate detector inserts rows when patterns
--                          fire (deferred — written by future job).
--   trial_signup_attempts  Audit log for every trial-start attempt
--                          (success, blocked-by-prior-trial, blocked-by-
--                          ban, blocked-by-eligibility-error). Used both
--                          for support disputes and as input to future
--                          abuse-pattern detection.
--
-- Lookups are exact-string only — see lib/trial.ts for normalization
-- (lowercase email, E.164 phone) so callers always insert canonicalized.

create table if not exists trial_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  phone text not null,
  tier text not null check (tier in ('starter','studio','scale')),
  billing_cycle text not null check (billing_cycle in ('monthly','annual')),
  stripe_subscription_id text,
  started_at timestamptz default now()
);

-- Hard uniqueness: never allow a 2nd trial for the same email or phone.
create unique index if not exists uq_trial_history_email
  on trial_history(lower(email));
create unique index if not exists uq_trial_history_phone
  on trial_history(phone);

create table if not exists trial_ban_list (
  id uuid primary key default gen_random_uuid(),
  -- Either email or phone is set (or both — when a single signup attempt
  -- triggers a ban for the pair). Lookups OR across both columns.
  email text,
  phone text,
  reason text not null,
  banned_by_user_id uuid,                -- support agent who banned them, if manual
  created_at timestamptz default now()
);

create index if not exists idx_trial_ban_email on trial_ban_list(lower(email))
  where email is not null;
create index if not exists idx_trial_ban_phone on trial_ban_list(phone)
  where phone is not null;

create table if not exists trial_signup_attempts (
  id uuid primary key default gen_random_uuid(),
  attempted_at timestamptz default now(),
  email text,
  phone text,
  ip text,
  device_fingerprint text,
  outcome text not null check (outcome in (
    'started',
    'blocked_email_already_used',
    'blocked_phone_already_used',
    'blocked_email_banned',
    'blocked_phone_banned',
    'blocked_phone_unverified',
    'blocked_other'
  )),
  notes text
);

create index if not exists idx_trial_attempts_email
  on trial_signup_attempts(lower(email));
create index if not exists idx_trial_attempts_phone
  on trial_signup_attempts(phone);
create index if not exists idx_trial_attempts_time
  on trial_signup_attempts(attempted_at desc);

-- RLS: writes only via service role. Users have no read access — this is
-- compliance / audit data.
alter table trial_history enable row level security;
alter table trial_ban_list enable row level security;
alter table trial_signup_attempts enable row level security;
-- (no policies = no public access, service-role bypasses RLS)
