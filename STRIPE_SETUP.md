# Stripe setup — OYRB launch playbook

This document is the authoritative guide for provisioning every Product, Price,
and Webhook OYRB needs in Stripe. The pricing structure below is the source of
truth; `src/lib/plans.ts` mirrors the same numbers in code. If anything ever
disagrees, **fix `plans.ts` to match this file**, not the other way around.

> ⚠️ **No customer migration required.** OYRB has zero live customers as of
> launch. You can create products from scratch in test mode, verify the flow
> end-to-end, then re-run the same script in live mode.

---

## A. Products & Prices

Create one Product per plan + one for the add-on. Each Product gets a monthly
and an annual Price.

### 1. Starter Plan
- **Description:** For solo professionals just getting started.
- Prices:
  - **`$29.00 USD / month`** — nickname `starter_monthly`, metadata: `{ tier: "starter", sites_included: "1", site_cap: "1" }`
  - **`$290.00 USD / year`** — nickname `starter_annual`, metadata: `{ tier: "starter", sites_included: "1", site_cap: "1" }`

### 2. Studio Plan
- **Description:** For growing studios that need more capacity.
- Prices:
  - **`$69.00 USD / month`** — nickname `studio_monthly`, metadata: `{ tier: "studio", sites_included: "2", site_cap: "3" }`
  - **`$690.00 USD / year`** — nickname `studio_annual`, metadata: `{ tier: "studio", sites_included: "2", site_cap: "3" }`

### 3. Scale Plan
- **Description:** For multi-stylist shops and suite operators.
- Prices:
  - **`$129.00 USD / month`** — nickname `scale_monthly`, metadata: `{ tier: "scale", sites_included: "3", site_cap: "5" }`
  - **`$1290.00 USD / year`** — nickname `scale_annual`, metadata: `{ tier: "scale", sites_included: "3", site_cap: "5" }`

### 4. Additional Site Add-on
- **Description:** One additional booking site, billed alongside your plan.
- Prices:
  - **`$25.00 USD / month`** — nickname `addon_site_monthly`, metadata: `{ type: "site_addon" }`
  - **`$250.00 USD / year`** — nickname `addon_site_annual`, metadata: `{ type: "site_addon" }`

> Annual ≈ "2 months free" (10/12 of monthly × 12 = ~17% savings). Same logic
> applies to the add-on.

---

## B. Setup script

`stripe_setup.js` at the project root does all of the above for you. It is:

- **Idempotent.** Looks up Products by name; reuses if found, creates if not.
  Same for Prices (matches by Product + nickname). Re-running is a no-op.
- **Test-mode by default.** The script reads `STRIPE_SECRET_KEY` from your
  shell environment. Use a test key (`sk_test_…`) the first time. Re-run with
  the live key (`sk_live_…`) once you've verified the flow.
- **Logs every product and price ID it touches**, including ones it found
  pre-existing.
- **Outputs a ready-to-paste env block** at the end for `.env.local` /
  `vercel env`.

### Running it

```bash
# 1. Install Stripe SDK (if you don't have it)
npm install stripe

# 2. Test mode first
export STRIPE_SECRET_KEY="sk_test_..."
node stripe_setup.js

# 3. Copy the printed env block into your local `.env.local` and into Vercel
#    (Settings → Environment Variables → Production)

# 4. Deploy. Test the full flow with Stripe test cards (see section D below).

# 5. Once verified end-to-end, re-run with the live key:
export STRIPE_SECRET_KEY="sk_live_..."
node stripe_setup.js

# 6. Copy the new (live-mode) env block into Vercel production env vars,
#    swap STRIPE_SECRET_KEY to the live key, redeploy.
```

---

## C. Environment variables

Every Stripe-related env var the app reads. The setup script generates the
`STRIPE_PRICE_*` IDs for you; the rest you provide. See `.env.example` for
the canonical list (Stripe + everything else).

| Variable | Where it comes from | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys | `sk_test_…` for test, `sk_live_…` for live |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → Webhooks (signing secret) | Different per environment |
| `STRIPE_PRICE_STARTER_MONTHLY` | Output of `stripe_setup.js` | |
| `STRIPE_PRICE_STARTER_ANNUAL` | " | |
| `STRIPE_PRICE_STUDIO_MONTHLY` | " | |
| `STRIPE_PRICE_STUDIO_ANNUAL` | " | |
| `STRIPE_PRICE_SCALE_MONTHLY` | " | |
| `STRIPE_PRICE_SCALE_ANNUAL` | " | |
| `STRIPE_PRICE_ADDON_SITE_MONTHLY` | " | |
| `STRIPE_PRICE_ADDON_SITE_ANNUAL` | " | |

---

## D. End-to-end launch checklist

1. **Provision in test mode.** Run `stripe_setup.js` with a `sk_test_…` key.
   Save the printed price IDs.
2. **Wire env vars locally.** Paste price IDs into `.env.local`. Set
   `STRIPE_SECRET_KEY` to the test key. Use the test webhook secret from
   Stripe → Developers → Webhooks for the test endpoint.
3. **Test the full flow with Stripe test cards.** Use card
   `4242 4242 4242 4242` (always succeeds) or `4000 0000 0000 9995` (insufficient
   funds) for failure scenarios. Walk through:
   - Sign up → pick Studio Annual → checkout completes → land on dashboard
     with 2 sites included
   - Add another site (Studio cap is 3) → addon checkout → site appears,
     subscription line items now show `studio_annual` + `addon_site_annual` × 1
   - Try to add a 4th site → should be blocked ("upgrade to Scale")
   - Switch user to Scale → should be allowed up to 5 sites
   - Try to downgrade Scale → Starter while owning 3 sites → should be blocked
   - Cancel subscription → all sites archived, dashboard back to upsell
   - Failed payment scenario → verify `invoice.payment_failed` puts the
     account into `past_due` state and the user sees the in-app banner
4. **Set up the webhook in test mode** (Stripe → Developers → Webhooks →
   Add endpoint). Point it at `https://oyrb.space/api/stripe/webhook` (or
   your preview URL for testing). Subscribe to the events listed in
   section E. Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
5. **Promote to live mode.** Re-run `stripe_setup.js` with the `sk_live_…`
   key. Update Vercel production env vars: swap `STRIPE_SECRET_KEY` to
   live, paste the new live price IDs, set `STRIPE_WEBHOOK_SECRET` to the
   live webhook secret.
6. **Recreate the webhook in live mode** with the same event subscriptions.
   Use the live signing secret.
7. **Smoke-test in production** with a real card on a $29 plan; refund
   yourself afterwards.

---

## E. Webhook events the app must handle

The webhook lives at `src/app/api/stripe/webhook/route.ts`. Subscribe to the
following events in Stripe Dashboard → Developers → Webhooks. Each maps to a
specific bit of app behavior:

| Stripe event | App behavior |
|---|---|
| `checkout.session.completed` | First checkout for a user → create their `account_subscription` row + first `business`. Subsequent add-on checkouts are handled by `customer.subscription.updated` instead. |
| `customer.subscription.updated` | Sync plan changes (tier upgrades/downgrades, cycle changes) and recompute `addon_count` from the subscription's line items. Update site cap. |
| `customer.subscription.deleted` | Mark account as `cancelled`. Soft-archive every business owned by the user (do not delete data — they may resubscribe). |
| `invoice.payment_succeeded` | Confirm renewal. Reset any grace-period flag. Optionally email a receipt. |
| `invoice.payment_failed` | Set account `status` to `past_due`. App shows a banner asking the user to update their card. After Stripe's retry policy expires the subscription will be cancelled (handled above). |
| `customer.subscription.trial_will_end` | (Optional, only if free trials are added.) Email the user that their trial ends in 3 days. |

> **Idempotency:** Stripe retries webhooks. Every handler must be
> idempotent — selecting / upserting by `stripe_subscription_id` instead of
> blindly inserting. The current handler does this.

---

## F. Pricing logic snapshot (cross-reference)

| Plan | Monthly | Annual | Sites included | Site cap |
|---|---|---|---|---|
| Starter | $29/mo | $290/yr | 1 | 1 (no add-ons) |
| Studio | $69/mo | $690/yr | 2 | 3 |
| Scale | $129/mo | $1290/yr | 3 | 5 |

Add-on: $25/mo or $250/yr per extra site. Studio + Scale only, capped by tier.
Annual saves ~17% (= "2 months free").

---

## G. Free trial flow

OYRB ships a 14-day free trial on every plan + cycle. No new Stripe products
needed — the trial is just `trial_period_days: 14` on subscription creation,
plus payment-method-collection set to `always` so a card is required up front.

### Stripe setup

- Trial subscriptions are created from `/api/checkout` with
  `trial_period_days: 14` and `trial_settings.end_behavior.missing_payment_method = "cancel"`.
  If the user removes their card during the trial, the subscription is cancelled
  rather than left dangling.
- "Skip trial and start now" creates a subscription **without** `trial_period_days`
  so Stripe charges today. Same product / price IDs.
- Mid-trial conversion: `/api/dashboard/end-trial-now` calls
  `stripe.subscriptions.update(id, { trial_end: "now" })`. The customer is
  charged immediately and add-on purchases unlock.

### Webhook events (in addition to those in section E)

| Stripe event | App behavior |
|---|---|
| `customer.subscription.created` (in trial state) | Webhook upserts the account row with `status = trialing` and writes a `trial_history` row keyed by (email, phone). Unique indexes on each prevent a second trial. |
| `customer.subscription.trial_will_end` | Fires 3 days before the trial ends. Used as the trigger for the 3-day reminder email (TODO — email job not yet wired). |
| `customer.subscription.updated` (status changed `trialing` → `active`) | Sync status flip; no schema work needed since the webhook re-derives `status` from the subscription object. |
| `invoice.payment_succeeded` (first one after trial) | Status flips to `active`; bump `current_period_end`. |
| `invoice.payment_failed` (after trial conversion) | Status flips to `past_due`; in-app banner asks the user to update their card. |

### Abuse prevention

Implemented today:
- `trial_history` table with unique indexes on `lower(email)` and `phone`.
  A 2nd trial for the same email or phone is impossible at the DB layer.
- `trial_ban_list` table — explicit permanent bans on emails / phones.
  Lookups happen before trial creation; a banned identity sees a friendly
  "free trials aren't available — start a paid plan" message and can still
  pay directly.
- `trial_signup_attempts` audit log — every attempt (success, blocked-by-
  prior-trial, blocked-by-ban, phone-unverified) recorded with timestamp,
  email, phone, IP. Useful for support disputes and as input to future
  abuse-pattern detection.
- Phone verification required: trial signup demands a Twilio Verify SMS
  code. The verification token (signed JWT, 30-min) is the proof that the
  phone is real before a `trial_history` row is written.

Deferred (planned, but not in this commit):
- **Auto-ban detector.** A background job that watches `trial_signup_attempts`
  for the patterns in the spec (same phone twice, same payment-method
  fingerprint twice, 3+ attempts from one device fingerprint in 30 days)
  and inserts ban rows automatically.
- **Payment method fingerprint dedup.** Stripe surfaces a `fingerprint` on
  `payment_methods` — store it on `account_subscriptions` and refuse a
  trial when the same fingerprint appears across two different accounts.
- **Device fingerprint.** Requires a client lib (FingerprintJS or similar);
  pipeline already has a `device_fingerprint` column ready in
  `trial_signup_attempts`.
- **Reminder emails (7 / 3 / 1 days before end).** Need Resend templates
  and a scheduled job that queries `account_subscriptions` for trialing
  rows whose `current_period_end` falls inside the target window.

## H. What this app does NOT do for billing

- **No proration UI.** Stripe handles proration when a user adds an add-on
  mid-cycle; the app just confirms the change. The Stripe email receipt is
  the canonical record.
- **No invoice download UI.** Use Stripe Customer Portal for that —
  `src/app/api/stripe/portal/route.ts` already creates a portal session.
- **No tax handling beyond what Stripe Tax provides.** Configure tax in the
  Stripe Dashboard if you collect outside the US-only flow.
