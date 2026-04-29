-- 033 - Pass the Torch visibility mode
-- Lets each pro pick when their Pro Referrals section appears on their
-- public storefront page:
--   - 'always'        : render whenever there's at least one accepted
--                       referral.
--   - 'smart' (def)   : render during active vacation, on incoming
--                       ?ref= visits, or in the booking-flow inline
--                       widget. Matches the day-one behavior.
--   - 'vacation_only' : render only during an active vacation window.
--
-- The booking-flow surface intentionally ignores this setting — it
-- only fires when the pro is already losing the client (no slots / no
-- matching service), so we always show referrals there.

alter table public.businesses
  add column if not exists pass_the_torch_visibility text not null default 'smart'
    check (pass_the_torch_visibility in ('always','smart','vacation_only'));
