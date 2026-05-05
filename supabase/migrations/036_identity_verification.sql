-- 036 - Stripe Identity verification (Phase 1.4)
--
-- Pros opt into Stripe-hosted identity verification from their dashboard
-- settings. On success, a "✓ Verified" badge renders next to the
-- business name across all 5 storefront templates. Verification is
-- never a gate — bookings, deposits, and payouts work the same
-- regardless of status. The badge is purely a trust signal.
--
-- Privacy: OYRB never stores the actual ID document image or selfie.
-- Stripe Identity holds the PII server-side. We persist only the
-- session id (for webhook lookups), the lifecycle status, and two
-- timestamps used by the 90-day retry cooldown that protects us from
-- runaway verification cost (each attempt is ~$1.50).

alter table public.businesses
  add column if not exists identity_verification_status text
    check (identity_verification_status in ('none','pending','verified','requires_input','failed'))
    default 'none',
  add column if not exists identity_verification_session_id text,
  add column if not exists identity_verified_at timestamptz,
  -- 90-day cooldown anchor — the start route reads this to decide
  -- whether a pro in 'failed' or 'requires_input' may retry.
  add column if not exists identity_last_attempted_at timestamptz;

-- Webhook lookup path — identity events identify the row by the Stripe
-- session id stored at start time.
create index if not exists idx_businesses_identity_session
  on public.businesses(identity_verification_session_id)
  where identity_verification_session_id is not null;
