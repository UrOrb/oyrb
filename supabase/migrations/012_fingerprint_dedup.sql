-- Capture the Stripe payment-method fingerprint on every account
-- subscription so we can dedup across accounts. The fingerprint is unique
-- per physical card across all Stripe accounts (it's the same value if the
-- same card is attached to two different customers).
alter table account_subscriptions
  add column if not exists payment_method_fingerprint text;

create index if not exists idx_account_sub_pm_fingerprint
  on account_subscriptions(payment_method_fingerprint)
  where payment_method_fingerprint is not null;

-- Add the new audit-log outcome. Drop+add the existing CHECK so it stays
-- a true allowlist (any future outcome must be added explicitly).
alter table trial_signup_attempts
  drop constraint if exists trial_signup_attempts_outcome_check;
alter table trial_signup_attempts
  add constraint trial_signup_attempts_outcome_check
  check (outcome in (
    'started',
    'blocked_email_already_used',
    'blocked_phone_already_used',
    'blocked_email_banned',
    'blocked_phone_banned',
    'blocked_phone_unverified',
    'blocked_payment_method_duplicate',
    'blocked_other'
  ));
