-- =========================================================================
-- Pass the Torch — local QA script
--
-- Run scenarios independently against your local Supabase. Each block
-- is self-contained: setup, what to do in the UI, expected result,
-- verification query, and cleanup. Tests state-machine logic only —
-- email-send paths are intentionally out of scope (test those by
-- hand with two browser windows).
--
-- Before running: paste your two test slugs below. The script reads
-- the businesses by slug at the top of each scenario so you can re-run
-- a single block without re-doing setup.
--
-- Runner: Supabase Studio → SQL editor. Copy a single scenario at a
-- time, run setup, do the UI step, run verification, run cleanup
-- before moving to the next scenario.
-- =========================================================================

-- =========================================================================
-- TEST POROS — edit these two slugs to match your local test accounts.
-- Pick any two published OYRB sites you own. The script always uses A
-- as the "actor" (the pro doing things in the UI) and B as the
-- "target" (the pro on the other side of the relationship).
-- =========================================================================
--
--   slug_a := 'glamboxroomllc-mo8xhd0q'         -- A: actor / requester
--   slug_b := 'lifeasalaniarenee-mo8pjfjn'      -- B: target / receiver
--
-- =========================================================================


-- =========================================================================
-- SCENARIO 1 — 5-pro cap blocks a 6th outgoing
--
-- Fills A's 5 active "slots" with dummy pending invites, then has you
-- try to send a 6th outgoing (request OR invite) via the UI. The action
-- counts pending+accepted referrals AND pending invites toward the cap,
-- so 5 invites is enough to saturate it without requiring 5 real peers.
-- =========================================================================

-- 1a. Setup — insert 5 pending invites for A.
insert into public.pro_invites (requesting_business_id, invitee_email, token, status)
select
  (select id from public.businesses where slug = 'glamboxroomllc-mo8xhd0q'),
  format('qa-cap-%s@example.com', g),
  encode(gen_random_bytes(16), 'hex'),
  'pending'
from generate_series(1, 5) as g
on conflict (requesting_business_id, invitee_email) do nothing;

-- 1b. Verify A is now at exactly 5 active outgoing.
select
  (select count(*) from public.pro_referrals
     where requesting_business_id = (select id from public.businesses where slug = 'glamboxroomllc-mo8xhd0q')
     and status in ('pending','accepted')) as active_referrals,
  (select count(*) from public.pro_invites
     where requesting_business_id = (select id from public.businesses where slug = 'glamboxroomllc-mo8xhd0q')
     and status = 'pending') as pending_invites;
-- Expected: active_referrals + pending_invites = 5

-- 1c. UI step — sign in as A. Open /dashboard/pass-the-torch →
--     "+ Add Trusted Pro" → Search tab → search any other slug →
--     pick the result → "Continue" → check the vouch box → Send Request.
-- Expected: red error toast "You've reached the 5-pro limit. Remove
--           one before adding another."
-- Repeat with the Invite by email tab using a fresh address.
-- Expected: same error message.

-- 1d. Cleanup — remove the dummy invites.
delete from public.pro_invites
where requesting_business_id = (select id from public.businesses where slug = 'glamboxroomllc-mo8xhd0q')
  and invitee_email like 'qa-cap-%@example.com';


-- =========================================================================
-- SCENARIO 2 — 30-day decline cooldown blocks a re-request
--
-- Inserts a declined pro_referrals row from A → B with the cooldown
-- still in the future. UI re-request from A should be blocked.
-- =========================================================================

-- 2a. Setup — declined row with active cooldown.
insert into public.pro_referrals (
  requesting_business_id, receiving_business_id,
  status, decline_cooldown_until, requested_at, responded_at
)
select
  (select id from public.businesses where slug = 'glamboxroomllc-mo8xhd0q'),
  (select id from public.businesses where slug = 'lifeasalaniarenee-mo8pjfjn'),
  'declined',
  now() + interval '20 days',
  now() - interval '10 days',
  now() - interval '10 days'
on conflict (requesting_business_id, receiving_business_id) do update set
  status = 'declined',
  decline_cooldown_until = excluded.decline_cooldown_until,
  responded_at = excluded.responded_at,
  requester_acknowledged_at = null,
  receiver_acknowledged_at = null;

-- 2b. Verify state.
select status, decline_cooldown_until, decline_cooldown_until > now() as still_locked
from public.pro_referrals
where requesting_business_id = (select id from public.businesses where slug = 'glamboxroomllc-mo8xhd0q')
  and receiving_business_id = (select id from public.businesses where slug = 'lifeasalaniarenee-mo8pjfjn');
-- Expected: status=declined, still_locked=true.

-- 2c. UI step — as A, /dashboard/pass-the-torch → Add → Search slug B
--     → Continue → vouch → Send Request.
-- Expected: red toast "This pro recently declined. Try again later."

-- 2d. Now expire the cooldown to verify the unblock path works.
update public.pro_referrals
set decline_cooldown_until = now() - interval '1 day'
where requesting_business_id = (select id from public.businesses where slug = 'glamboxroomllc-mo8xhd0q')
  and receiving_business_id = (select id from public.businesses where slug = 'lifeasalaniarenee-mo8pjfjn');

-- 2e. UI step — repeat the request flow.
-- Expected: success. The row flips to status=pending (re-uses the same
--           row via the unique-constraint update path in requestReferral),
--           with a fresh requester_acknowledged_at.

-- 2f. Cleanup — delete the relationship row entirely.
delete from public.pro_referrals
where requesting_business_id = (select id from public.businesses where slug = 'glamboxroomllc-mo8xhd0q')
  and receiving_business_id = (select id from public.businesses where slug = 'lifeasalaniarenee-mo8pjfjn');


-- =========================================================================
-- SCENARIO 3 — Storefront renders cleanly with NO referrals
--
-- Confirms the empty-state path. Strips any Pass the Torch state from
-- A, then loads A's storefront and verifies the section is hidden.
-- =========================================================================

-- 3a. Setup — clear all PtT state for A so we KNOW it's empty.
delete from public.pro_referrals
where requesting_business_id = (select id from public.businesses where slug = 'glamboxroomllc-mo8xhd0q');
delete from public.pro_invites
where requesting_business_id = (select id from public.businesses where slug = 'glamboxroomllc-mo8xhd0q');
update public.businesses set
  vacation_start = null, vacation_end = null, vacation_message = null,
  pass_the_torch_visibility = 'smart',
  pass_the_torch_enabled = true
where slug = 'glamboxroomllc-mo8xhd0q';

-- 3b. UI step — visit https://localhost:3000/s/glamboxroomllc-mo8xhd0q
--     in an incognito window (so no ?ref= is sticky from prior tests).
-- Expected: page loads normally. NO "Pro Referrals" section anywhere.
--           NO vacation banner. Booking widget opens, shows real
--           dates/slots if any, no inline pro referrals.

-- 3c. UI step — also visit /s/glamboxroomllc-mo8xhd0q?ref=fakeslug
-- Expected: NO "Recommended by …" badge (fakeslug doesn't resolve to
--           a published pro), NO Pro Referrals section, NO vacation
--           banner. Healthy storefront stays clean.


-- =========================================================================
-- SCENARIO 4 — Storefront renders the section when there's at least
-- one accepted referral AND a trigger context fires
-- =========================================================================

-- 4a. Setup — insert one accepted referral A → B. Both consent
--     timestamps set, so it's a real, valid relationship row.
insert into public.pro_referrals (
  requesting_business_id, receiving_business_id, status, position,
  vouch_note, requester_acknowledged_at, receiver_acknowledged_at,
  requested_at, responded_at
)
select
  (select id from public.businesses where slug = 'glamboxroomllc-mo8xhd0q'),
  (select id from public.businesses where slug = 'lifeasalaniarenee-mo8pjfjn'),
  'accepted', 0,
  'QA fixture — she does my brows when I''m out',
  now(), now(), now(), now()
on conflict (requesting_business_id, receiving_business_id) do update set
  status = 'accepted',
  vouch_note = excluded.vouch_note,
  requester_acknowledged_at = excluded.requester_acknowledged_at,
  receiver_acknowledged_at = excluded.receiver_acknowledged_at,
  responded_at = excluded.responded_at;

-- 4b. UI step (a) — visit /s/glamboxroomllc-mo8xhd0q (no ?ref=).
-- Expected (visibility=smart, no vacation): NO section. The smart
--           gate hides it on healthy days.

-- 4c. UI step (b) — set visibility to "always" via the dashboard
--     dropdown OR run:
update public.businesses
set pass_the_torch_visibility = 'always'
where slug = 'glamboxroomllc-mo8xhd0q';
--     Reload /s/glamboxroomllc-mo8xhd0q.
-- Expected: "Pro Referrals" section renders with one card showing B's
--           name, slug, vouch note. Card link points to
--           /s/<B-slug>?ref=glamboxroomllc-mo8xhd0q.

-- 4d. UI step (c) — back to smart, fire vacation:
update public.businesses
set
  pass_the_torch_visibility = 'smart',
  vacation_start = now() - interval '1 day',
  vacation_end = now() + interval '7 days',
  vacation_message = 'QA fixture — back next week.'
where slug = 'glamboxroomllc-mo8xhd0q';
--     Reload storefront.
-- Expected: top vacation banner ("Glambox is away …, see their pro
--           referrals below."). Banner click smooth-scrolls to the
--           section, which now also renders.

-- 4e. UI step (d) — visit /s/glamboxroomllc-mo8xhd0q?ref=lifeasalaniarenee-mo8pjfjn
--     (without vacation). First clear vacation:
update public.businesses
set vacation_start = null, vacation_end = null, vacation_message = null
where slug = 'glamboxroomllc-mo8xhd0q';
--     Reload with the ?ref= URL.
-- Expected: small "💛 Recommended by Life as a Lania Renee" banner at
--           the top of the storefront, AND the Pro Referrals section
--           renders below.

-- 4f. Cleanup.
delete from public.pro_referrals
where requesting_business_id = (select id from public.businesses where slug = 'glamboxroomllc-mo8xhd0q')
  and receiving_business_id = (select id from public.businesses where slug = 'lifeasalaniarenee-mo8pjfjn');
update public.businesses set
  vacation_start = null, vacation_end = null, vacation_message = null,
  pass_the_torch_visibility = 'smart'
where slug = 'glamboxroomllc-mo8xhd0q';


-- =========================================================================
-- SCENARIO 5 — Block flow prevents future requests from A → B
--
-- Inserts a my-side blocked row (A blocking B). UI request from A → B
-- should fail with "You've blocked this pro."
-- =========================================================================

-- 5a. Setup — A blocks B.
insert into public.pro_referrals (
  requesting_business_id, receiving_business_id, status, requested_at, responded_at
)
select
  (select id from public.businesses where slug = 'glamboxroomllc-mo8xhd0q'),
  (select id from public.businesses where slug = 'lifeasalaniarenee-mo8pjfjn'),
  'blocked', now(), now()
on conflict (requesting_business_id, receiving_business_id) do update set
  status = 'blocked',
  responded_at = excluded.responded_at,
  requester_acknowledged_at = null,
  receiver_acknowledged_at = null,
  decline_cooldown_until = null;

-- 5b. Verify.
select status from public.pro_referrals
where requesting_business_id = (select id from public.businesses where slug = 'glamboxroomllc-mo8xhd0q')
  and receiving_business_id = (select id from public.businesses where slug = 'lifeasalaniarenee-mo8pjfjn');
-- Expected: status = blocked.

-- 5c. UI step — as A, /dashboard/pass-the-torch → Add → Search slug B
--     → expected: B doesn't appear in the search results because
--     searchProsBySlug excludes pros with the master toggle off, but
--     blocked rows aren't filtered there. If you paste B's full URL
--     and click "Continue" → vouch → Send Request:
-- Expected: red toast "You've blocked this pro."

-- 5d. UI step — verify B is unaffected: load B's dashboard /
--     pass-the-torch as user B. B should still be able to send a
--     request to A (block is one-directional).

-- 5e. Cleanup.
delete from public.pro_referrals
where requesting_business_id = (select id from public.businesses where slug = 'glamboxroomllc-mo8xhd0q')
  and receiving_business_id = (select id from public.businesses where slug = 'lifeasalaniarenee-mo8pjfjn');


-- =========================================================================
-- FULL RESET — wipe all Pass the Torch state for both test pros.
-- Run this at the end (or any time) to leave a clean slate.
-- =========================================================================

delete from public.pro_referrals
where requesting_business_id in (
        select id from public.businesses
        where slug in ('glamboxroomllc-mo8xhd0q','lifeasalaniarenee-mo8pjfjn'))
   or receiving_business_id in (
        select id from public.businesses
        where slug in ('glamboxroomllc-mo8xhd0q','lifeasalaniarenee-mo8pjfjn'));

delete from public.pro_invites
where requesting_business_id in (
        select id from public.businesses
        where slug in ('glamboxroomllc-mo8xhd0q','lifeasalaniarenee-mo8pjfjn'));

update public.businesses
set
  vacation_start = null, vacation_end = null, vacation_message = null,
  pass_the_torch_enabled = true,
  pass_the_torch_visibility = 'smart'
where slug in ('glamboxroomllc-mo8xhd0q','lifeasalaniarenee-mo8pjfjn');
