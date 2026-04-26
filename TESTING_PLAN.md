# Stripe Connect — Testing & Beta Plan

Companion to `STRIPE_SETUP.md`. Covers everything between "Phase 6 merged"
and "`CLIENT_PAYMENTS_ENABLED=true` in production live mode."

Read top-to-bottom. Skip nothing on the production checklist.

---

## A. Sandbox test plan (Stripe test mode)

### A.1 Setup once

1. **Stripe API keys** in `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_…
   STRIPE_WEBHOOK_SECRET=whsec_…              # platform listener (run #1 below)
   STRIPE_CONNECT_WEBHOOK_SECRET=whsec_…       # connect listener (run #2)
   CLIENT_PAYMENTS_ENABLED=true
   PAY_NOW_ENABLED=true
   ```

2. **Two `stripe listen` processes**, each prints its own signing secret:
   ```bash
   # platform events (subscriptions, the existing flow)
   stripe listen --forward-to localhost:3000/api/stripe/webhook

   # connect events (everything Phase 4 added)
   stripe listen --forward-connect \
     --forward-to localhost:3000/api/stripe/webhook/connect
   ```
   `--forward-connect` is the critical flag — without it the second
   listener gets nothing.

3. **Test pros to create.** Sign up two test accounts under different
   emails (use `+suffix` aliases on the same inbox so you get the
   confirmations). Name them so you remember what they're for:
   - `pro-happy@<you>.com` — drives the happy path end-to-end.
   - `pro-stuck@<you>.com` — stays in a partial / restricted state for
     gating tests.

### A.2 Scenarios

Each scenario is *setup → walk-through → verify*. Verification means
DB state, Stripe Dashboard, the OYRB UI, and emails — confirm all four,
not just the visible UI.

#### S1. Pro completes onboarding end-to-end

**Setup.** Sign in as `pro-happy`. Visit `/dashboard/payments`.

**Walk.** Click **Connect Stripe**. In the Stripe-hosted flow use any
test SSN (`000-00-0000`), test routing/account (`110000000` /
`000123456789`), and a test phone. Submit. You should land at
`/dashboard/payments?onboarded=1`.

**Verify.**
- DB: `select stripe_connect_account_id, stripe_connect_charges_enabled, stripe_connect_onboarding_complete, stripe_connect_payouts_enabled, stripe_connect_details_submitted from businesses where id = '<happy-biz-id>';` — all flags `true`, account_id starts with `acct_`.
- UI: `/dashboard/payments` shows "Connected and ready" status card with
  green Charges + Payouts indicators.
- UI: `/dashboard` no longer shows the Connect banner.
- UI: `/dashboard/services` deposit input is editable.
- DB: a row in `stripe_connect_events` with `event_type='account.updated'`
  and `status='success'`.

#### S2. Pro abandons mid-onboarding then resumes

**Setup.** Sign in as `pro-stuck`. Click **Connect Stripe**. On the
Stripe page, fill *only* business name + URL, then close the tab.

**Walk.** Return to `/dashboard/payments`. Status should be
"Onboarding in progress" with whatever Stripe currently lists in
`requirements_currently_due`. Click **Complete Stripe setup**.

**Verify.**
- DB: `stripe_connect_account_id` is set; `stripe_connect_onboarding_complete` is `false`. The same `acct_…` survives across both clicks (no duplicate Stripe account created).
- Phase 5 banner on `/dashboard` shows "Finish your Stripe setup".
- Stripe Dashboard → Connect → Standard accounts: exactly one
  `acct_…` for this pro.

#### S3. Pro becomes restricted, then re-enabled

**Setup.** `pro-happy` from S1, fully onboarded.

**Walk.** Synthetic restriction:
```bash
stripe trigger account.updated \
  --override account:acct_<happy>: \
  --add account:charges_enabled:false
```
(or open the test account in Stripe Dashboard → flip a requirement).

**Verify (restriction).**
- Within ~5s: DB `stripe_connect_charges_enabled = false`.
- `/dashboard` Connect banner: "Stripe paused new charges…"
- `/dashboard/services`: deposit input locked.
- Storefront `/s/<slug>`: booking widget on a deposit-bearing service
  shows "Online payment not available — contact directly."
- `/booking/<token>/pay` (if a magic link is open): renders the new
  Phase 6 PaymentUnavailableView.

**Walk (recovery).** Trigger another `account.updated` flipping
`charges_enabled` back to true.

**Verify.** All four UI surfaces revert. DB column flips back. Two new
rows in `stripe_connect_events` (one per trigger), both `success`.

#### S4. Pro disconnects from OYRB

**Walk.** `/dashboard/payments` → Disconnect → confirm.

**Verify.**
- DB: `stripe_connect_account_id` is NULL, all flags `false`.
- UI: dashboard banner is back to "Set up Stripe…"
- Storefront: gift-cards page falls through to the "hasn't set up online
  gift cards yet" view.
- The Stripe-side `acct_…` still exists in the test dashboard — Phase 2
  is a soft disconnect by design.

#### S5. Pro disconnects from Stripe side (deauthorized)

**Setup.** Reconnect a fresh test acct for `pro-happy` (S1 again, picks
up a brand-new `acct_…`).

**Walk.**
```bash
stripe trigger account.application.deauthorized \
  --override account:acct_<new>:
```

**Verify.** Same DB state as S4 (acct_id null, all flags false). Row
in `stripe_connect_events` with that event type. The UI reflects the
state on next refresh (no realtime push — that's fine).

#### S6. Client deposit checkout (happy path)

**Setup.** `pro-happy` ready. Has at least one service with
`deposit_cents > 0`. Site is published.

**Walk.** From an incognito window, visit `/s/<slug>` → open the
booking widget → pick the service → walk through to confirm → click
"Pay $X deposit & confirm." Use card `4242 4242 4242 4242`. Land at
`/s/<slug>/booking-confirmed?session_id=…&acct=acct_…`. Watch the page
flip from "Confirming…" to "Booking confirmed ✦".

**Verify.**
- New row in `bookings` with `deposit_paid=true`,
  `stripe_payment_intent_id` populated.
- Stripe test dashboard: a payment on the connected acct (NOT on the
  platform). Amount = deposit + tip.
- Email: client gets confirmation, pro gets owner-notification.
- `stripe_connect_events`: row with
  `event_type='checkout.session.completed'`, status `success`,
  `business_id` matches.

#### S7. Deposit checkout while pro not ready (gate hits)

**Setup.** `pro-stuck` not yet ready. Manually set
`stripe_connect_charges_enabled=false` if needed. The site is
published and has a service with `deposit_cents > 0`.

**Walk.** From storefront, try to book.

**Verify.**
- Confirm step shows "Online payment not available — contact directly"
  message in tan callout.
- Submit button label: "Online payment not available — contact directly"
  and disabled.
- POST to `/api/public/bookings/deposit-checkout` with curl returns
  503 + `{ error, code: "connect_restricted" }` (or the matching
  reason code per `loadConnectAccountForCheckout`).

#### S8. Pay-in-full (magic link)

**Setup.** A confirmed booking with `deposit_paid=true`. Resolve the
magic-link token from `bookings.access_token` (or trigger a rebook
reminder to email yourself). `PAY_NOW_ENABLED=true`.

**Walk.** Visit `/booking/<token>/pay` → Pay balance → use `4242…`.

**Verify.**
- DB: `paid_in_full_at`, `paid_amount_cents`, `pay_now_session_id` all
  set.
- Pro receipt email + client receipt email sent.
- `stripe_connect_events` shows the `checkout.session.completed`
  with `metadata.booking_type='pay_in_full'`.
- Stripe payment is on the connected account.

#### S9. Pay-in-full — pro not ready

**Setup.** Booking exists; pro is restricted (S3 first half).

**Walk.** Open `/booking/<token>/pay`.

**Verify.** PaymentUnavailableView (Phase 6) renders directly,
without the Pay button. No charge attempted, no errors in webhook log.

#### S10. Gift card purchase

**Setup.** `pro-happy` ready.

**Walk.** Storefront `/s/<slug>/gift-cards` → buy `$25` for self → pay.

**Verify.**
- `gift_cards` row inserted with the OYRB-XXXX-XXXX-XXXX code.
- Buyer receipt email + pro notification email both arrive.
- Connected-account payment shows in Stripe.
- `stripe_connect_events` row.

#### S11. Refund (issued from Stripe Dashboard)

**Setup.** A booking from S6 with a charge on the connected account.

**Walk.** Stripe test dashboard for the connected acct → Payments →
that charge → Refund. Issue a partial or full refund.

**Verify.**
- `charge.refunded` event lands on Connect endpoint.
- Pro receives the refund-issued email (OYRB → pro). Email subject
  includes the formatted refund amount.
- Booking row is *unchanged* — by design (Phase 4: no in-app refund
  state).
- `stripe_connect_events` entry, status success.
- `/dashboard/bookings` row still shows "Paid in full" pill — the
  Refund deep-link goes to the right charge.

#### S12. Dispute (chargeback)

**Setup.** Same booking. Use Stripe's dispute test card to create a
dispute, OR `stripe trigger charge.dispute.created`.

**Verify.**
- Pro receives the urgent dispute email with the
  `https://dashboard.stripe.com/disputes/<id>` deep link.
- `stripe_connect_events` row.
- No DB column changes on the booking — pros operate disputes from
  Stripe.

#### S13. Webhook idempotency

**Walk.** From Stripe Dashboard → Developers → Webhooks → click any
recent Connect event → Resend.

**Verify.**
- Server log: `[connect-webhook] <evt_id> (…) DUPLICATE — skipping`.
- `stripe_connect_events` for that `event_id` is a single row,
  unchanged.
- No duplicate emails / DB writes.

#### S14. Webhook failure recovery

**Walk.** Temporarily throw inside a Connect webhook handler (e.g.
`throw new Error("test")` in the gift-card branch). Buy a gift card.

**Verify.**
- `stripe_connect_events` row is `status='failed'` with
  `error_message` populated.
- Server returns 500; Stripe retries.
- Remove the throw; on Stripe's next retry, status flips to `success`
  and the gift card is created.

### A.3 Test cards quick reference

| Card | What it does |
|---|---|
| `4242 4242 4242 4242` | Always succeeds |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0027 6000 3184` | Requires 3-D Secure |
| `4000 0000 0000 0259` | Triggers a dispute on capture |
| `4000 0000 0000 0341` | Authentication succeeds, attaches but charge fails |

Use any future expiry, any CVC, any ZIP.

---

## B. Beta launch plan

### B.1 Picking the friendly pro(s)

Two pros is the right number. One is too few (no signal on whether
issues are pro-specific). Three+ creates a coordination problem you
don't need yet.

Look for:
- **Has called or texted you in the last 30 days** about anything,
  positive or negative. They'll tell you when something breaks.
- **Low to medium booking volume** (5–25/week). You want enough real
  charges to surface bugs but not so many that one bug means a dozen
  manual reconciliations.
- **A real, US-based business that can pass Stripe KYC.** No "I might
  start a salon someday" pros — you need real Tax ID + bank.
- **OK with being on a phone call if a charge breaks.** Not just
  "leaves feedback in chat eventually."

Avoid the squeakiest wheels. They'll surface real issues but burn
support time you don't have.

### B.2 Pre-beta engineering setup

Order matters here.

1. **Confirm sandbox plan §A is green.** All 14 scenarios pass.
2. **Stripe live-mode setup** (see §C for the full checklist).
3. **Beta pros' Vercel project flag.** Either:
   - Flip `CLIENT_PAYMENTS_ENABLED=true` globally (every pro can
     onboard, but only beta pros are *encouraged* to). Simpler. Means
     non-beta pros can stumble onto Connect on their own.
   - OR keep it false globally and per-request override for known
     business IDs. More code, more surface area for bugs.
   
   **Recommendation:** flip globally. Pros who don't connect see the
   "Connect Stripe" banner and can opt in or ignore. Beta-vs-not isn't
   really about gating, it's about which pros you're hand-holding.
3. **Pre-create the connected account flag.** Decide whether you want
   to hand-walk the beta pros through onboarding on a screen-share
   call — recommended for the first one. The second can do it solo
   while you watch Stripe Dashboard live.

### B.3 Beta comms template

Send via the channel you already use with this pro (text, email, or
DM). Keep it human, not a marketing blast.

> Hey **[name]** — quick update.
>
> I'm rolling out a way to take deposits and gift cards directly
> through your booking page. The money goes straight into your own
> Stripe account (you keep the $$$, I never touch it). I'm picking
> a couple of pros to try it first before opening it up.
>
> Want to be one of them? It's a 10-minute setup — Stripe will ask
> for your business info and bank account to deposit payouts. Cards
> show up the same way they do at any other booking site.
>
> No extra fee from me; only Stripe's normal processing fee
> (~2.9% + 30¢). You can disconnect anytime.
>
> If yes, I'll send you a short Loom + jump on a call with you to
> walk through it. Reply "in" and I'll set it up.

After they say yes:

> Awesome — here's what to expect:
>
> 1. Go to **oyrb.space/dashboard/payments**, click "Connect Stripe."
> 2. Stripe will ask for: business legal name, EIN or SSN, address,
>    and your business bank account.
> 3. Once you finish, the dashboard flips to "Connected and ready"
>    and your deposit/gift-card features turn on.
> 4. First charge: I'll be watching. If anything looks weird, text
>    me right away — I can refund instantly from my end.
>
> One ask: if a client says they were charged but didn't get a
> confirmation email, screenshot it and send it to me before doing
> anything else.

### B.4 Monitor during beta

Open these tabs at the start of every day during beta and end of every
day:

| What | Where |
|---|---|
| Stripe charge volume + decline rate (each beta pro's connected acct) | dashboard.stripe.com → Connect → Standard accounts → click pro → Payments |
| Webhook event delivery (Connect endpoint) | dashboard.stripe.com → Developers → Webhooks → /api/stripe/webhook/connect |
| Failed events (last 24h) | `select * from stripe_connect_events where status='failed' and received_at > now() - interval '24 hours';` |
| Booking creation rate vs charge rate | `select count(*) from bookings where business_id='<beta-id>' and created_at > now() - interval '24 hours';` paired with Stripe charge count for the same account |
| Vercel function logs for the Connect webhook | Vercel → Project → Logs → filter `path:/api/stripe/webhook/connect` |

Daily check-in text to the beta pro for the first week:

> Quick check — anything weird with bookings or payments today?

### B.5 Rollback (during beta)

The kill-switch makes this surgical, not nuclear.

| Severity | Action |
|---|---|
| One pro is broken, others are fine | SQL: `update businesses set stripe_connect_charges_enabled=false where id='<id>';` — surgical disable. Refund any in-flight charges from Stripe Dashboard. |
| Multiple pros affected, root cause unclear | `vercel env add CLIENT_PAYMENTS_ENABLED false` (or update via dashboard). All checkout routes return 503; existing bookings are untouched. UI flips to Phase 0 messaging. |
| Webhook flapping / data corruption suspected | Disable the Connect webhook endpoint in Stripe Dashboard (don't delete — keeps the URL + secret intact). Stripe queues retries for ~3 days. Fix the bug, re-enable, retries flow through the idempotency ledger. |
| Booking row missing for a known charge | Find the session in `stripe_connect_events`, manually insert the booking via SQL, refund the Stripe charge if the customer wants out, otherwise apologize and move on. |

**What rollback does NOT do:**
- Existing connected accounts stay connected. Disabling the kill-switch
  doesn't `account.application.deauthorize` anyone.
- In-flight Checkout sessions Stripe is currently rendering can still
  complete. The pre-flight only blocks new ones.
- Money already in pros' Stripe balances stays there. Connect direct
  charges mean OYRB never had it.

---

## C. Production checklist (before flipping the kill-switch)

Walk this top-to-bottom. Don't skip.

### C.1 Stripe Dashboard (live mode)

- [ ] Switch to **live** mode.
- [ ] **Connect platform settings** (Settings → Connect):
  - [ ] Brand name + support email + support URL set.
  - [ ] Industry set (matches what the test mode setup used).
  - [ ] Statement descriptor sane — pros' clients will see this on
        their card statements.
  - [ ] **Standard** accounts enabled.
- [ ] **Webhooks** (Developers → Webhooks):
  - [ ] Existing platform endpoint `https://oyrb.space/api/stripe/webhook` exists in live mode with the same event subscriptions (see `STRIPE_SETUP.md` §E).
  - [ ] **New** endpoint `https://oyrb.space/api/stripe/webhook/connect` created in live mode, listening to **Connected accounts**, with the events from `STRIPE_SETUP.md` §E.2.
  - [ ] Signing secrets copied — these are *different* from test mode.
- [ ] Fees: confirm no platform application fee is set anywhere
  (Phase 0 decision: $0 fees).

### C.2 Vercel env vars (Production)

- [ ] `STRIPE_SECRET_KEY` → `sk_live_…`
- [ ] `STRIPE_WEBHOOK_SECRET` → live platform `whsec_…`
- [ ] `STRIPE_CONNECT_WEBHOOK_SECRET` → live Connect `whsec_…`
- [ ] `CLIENT_PAYMENTS_ENABLED` is **`false`** for now (you flip it
  after the rest of the checklist).
- [ ] `PAY_NOW_ENABLED` set to your intended state (likely `false`
  initially).
- [ ] `NEXT_PUBLIC_APP_URL=https://www.oyrb.space` (used in the
  Stripe Connect onboard return URL).
- [ ] All `STRIPE_PRICE_*` IDs updated to live values from
  `stripe_setup.js --live`.

### C.3 Database state

- [ ] Migrations 029 + 030 applied in production. Quick check:
  ```sql
  select column_name from information_schema.columns
  where table_name='businesses' and column_name like 'stripe_connect%';
  -- expect 6 rows
  select tablename from pg_tables where tablename='stripe_connect_events';
  ```
- [ ] No leftover `stripe_connect_account_id` values from test mode.
  Test-mode `acct_…` IDs only resolve in test mode and would 404 in
  live mode.
  ```sql
  -- Safe nuke if any leaked through:
  update businesses
  set stripe_connect_account_id = null,
      stripe_connect_onboarding_complete = false,
      stripe_connect_charges_enabled = false,
      stripe_connect_payouts_enabled = false,
      stripe_connect_details_submitted = false,
      stripe_connect_requirements_currently_due = null
  where stripe_connect_account_id is not null;
  ```

### C.4 Comms to existing pros (if non-beta)

If you flip `CLIENT_PAYMENTS_ENABLED=true` globally, the dashboard
banner appears for everyone who isn't connected. Frame the rollout so
they know it's optional and what it does:

> Hey, OYRB has a new Payments tab. Connect Stripe to start taking
> deposits and selling gift cards directly through your booking page.
> Money goes straight to your Stripe — I never touch it, no extra
> fees from me.
>
> You don't have to do anything if you'd rather collect at the
> appointment as usual. Booking pages still work without Connect.

### C.5 Day-of monitoring

For the first 2 hours after flipping the kill-switch, sit on these:

- Stripe Dashboard → Developers → Webhooks → live Connect endpoint:
  watch for non-2xx responses.
- Vercel logs: `path:/api/stripe/webhook/connect`,
  `path:/api/public/bookings/deposit-checkout`,
  `path:/api/public/gift-cards/checkout`. Filter to errors.
- Supabase: `select status, count(*) from stripe_connect_events
  where received_at > now() - interval '2 hours' group by status;`
- Your inbox for incoming pro complaints.

If anything looks unusual: §B.5 rollback steps.

---

## D. Post-launch monitoring

### D.1 Daily metrics

| Metric | Target | Where to find |
|---|---|---|
| Connect webhook success rate | > 99% | Stripe → Developers → Webhooks → live Connect endpoint |
| `stripe_connect_events` failure rate (24h) | < 1% | SQL below |
| Failed bookings per successful charge | 0 | Compare bookings created vs Stripe charges |
| Disputes per 100 charges | < 1 | Stripe → live → Disputes |
| Average payout delay for pros | matches Stripe's standard schedule | Each pro's own Stripe Dashboard |

```sql
-- Rolling 24h Connect webhook outcome
select event_type, status, count(*)
from stripe_connect_events
where received_at > now() - interval '24 hours'
group by event_type, status
order by event_type, status;

-- Pros whose local state disagrees with Stripe-derivable expectations.
-- A row here is a candidate for a stuck account.updated event.
select id, business_name, stripe_connect_account_id,
  stripe_connect_charges_enabled, stripe_connect_onboarding_complete,
  stripe_connect_requirements_currently_due
from businesses
where stripe_connect_account_id is not null
  and stripe_connect_onboarding_complete = true
  and stripe_connect_charges_enabled = false
order by updated_at desc;

-- Recent failed events with their error messages
select event_id, event_type, account_id, error_message, received_at
from stripe_connect_events
where status = 'failed'
order by received_at desc
limit 20;
```

### D.2 Weekly review

- Read the last 7 days of `stripe_connect_events` failure rows. Each
  one should either be (a) a known transient that retried successfully
  later in the table or (b) actionable.
- Spot-check 3 random successful bookings: row exists, Stripe charge
  matches, both emails sent, no orphan `stripe_connect_events` rows.
- Diff: pros who connected this week, pros who churned. Anyone in the
  "restricted" state for > 7 days?

### D.3 "Stable enough to consider it shipped"

Connect can come off the explicit "beta" framing when *all* of these
are true:

- [ ] **30+ real charges** have completed end-to-end (booking row +
  Stripe payment + emails) without manual intervention.
- [ ] **0 unresolved `failed` rows** older than 24 hours in
  `stripe_connect_events`.
- [ ] **Webhook 99%+ success rate** sustained over 14 days.
- [ ] **At least one `account.updated` event** has flipped a pro's
  state in production (proves the live webhook + signing secret + DB
  sync is wired correctly — most easily triggered by a real Stripe
  KYC requirement update).
- [ ] **At least one refund** processed (proves the deep-link flow
  works for pros and the email ships).
- [ ] **No active rollback toggles** (`CLIENT_PAYMENTS_ENABLED=true`
  globally with no per-pro overrides masking issues).

After that bar: drop "beta" copy from the comms, mention it in the
pricing page, and consider it shipped.

---

## Open questions

These aren't blockers but are worth thinking about before §C:

1. **Do you want to gate Connect onboarding by tier?** Currently every
   tier can connect. If Starter shouldn't take payments, that's a
   single check on `/dashboard/payments` and a banner explaining why.
2. **Pro-facing help docs.** Phase 6 case 2 ("pro disconnects with
   active deposits collected") was deferred to Phase 8 docs — make
   sure that lands before public rollout.
3. **Do you want a soft launch announcement?** Linking Stripe to your
   site means tax form 1099-K issuance is the pro's responsibility
   (Stripe handles it), not OYRB's. Pros should know this is coming
   in January.
4. **Beta period length.** I'd recommend 14 days minimum, ending
   only when §D.3 criteria are met. Don't time-box it shorter just
   because the calendar wants you to.
