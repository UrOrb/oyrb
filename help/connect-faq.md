# Common payment questions

## Does OYRB charge a transaction fee?

**No.** Your monthly subscription is the only money you pay OYRB.

When a client pays you, Stripe takes their standard processing fee
(currently **2.9% + 30¢** per successful charge), and the rest is
yours. We don't take anything on top of that — not from you, not
from your client.

This is a deliberate choice. A lot of booking platforms add a 1–3%
"platform fee" or rebate on each transaction. We didn't want to.
The math works because OYRB is a subscription business — you pay
us monthly, that's the whole deal.

## What if a client disputes a charge (chargeback)?

You handle it from your own Stripe Dashboard.

When a chargeback opens, Stripe emails you, OYRB emails you, and the
disputed amount is held back from your next payout. You have a few
days (Stripe will tell you how many) to submit evidence — booking
confirmation, your cancellation policy, photos of the work, etc.

We'll email you when the dispute opens with a direct link to the
Stripe page. After that it's between you, the client's bank, and
Stripe. OYRB doesn't intervene because we're not the financial
party.

More detail: see **connect-troubleshooting.md**, "A client opened a
chargeback."

## Can I have multiple Stripe accounts?

Each OYRB *business* gets one Stripe account. If you run multiple
businesses on OYRB (different brands, different cities), each one
connects to its own separate Stripe account. They're tracked
independently.

If you already have a Stripe account from another platform (Square
Online, your own website, etc.), that's totally fine — it just
won't be the one OYRB uses. OYRB always creates a fresh Stripe
account when you click **Connect Stripe**, so you keep your
existing one untouched for whatever else you're using it for.

## What if I have a side business — can I use that Stripe account?

Technically you'd just run that business through OYRB and the
clients pay into the matching Stripe account. The catch: every
charge from OYRB clients will be tagged to that account's name on
the credit card statement. So if you run "Glow Studio" on OYRB but
your Stripe is named "Bake Sale Co," your client's statement says
**BAKE SALE CO** and they may not recognize the charge.

Cleanest path: let OYRB create a Stripe account for the OYRB
business. Stripe doesn't charge anything to have multiple accounts,
and your clients see the right business name on their statements.

## What countries are supported?

**United States only**, for now. Stripe Connect is available
internationally but we haven't tested OYRB outside the US yet —
booking flows, tax form issuance, and bank account linking all
need country-specific tweaks.

If you're outside the US and interested, send me a note. We're
likely to add Canada and the UK next, and direct demand moves it
up the list.

## What's the deposit fee process?

When a client pays a $20 deposit through your booking page:

1. Their card is charged $20 (plus any tip they added).
2. Stripe takes its 2.9% + 30¢ — about $0.88 on a $20 deposit.
3. The rest (about $19.12) lands in your Stripe balance.
4. Stripe pays it out to your bank on the normal schedule.

OYRB takes nothing from this. The whole 2.9% + 30¢ goes to Stripe.

For tipping: tips are included in the same charge, and Stripe's fee
applies to the total (deposit + tip). That's true of every payment
processor — there's no fee-free path for tips.

## Can my client pay in cash for the rest of the service?

Yes. The deposit is the only thing collected online. The remaining
balance can be cash, Venmo, another card swipe at the appointment,
or whatever you usually do. OYRB doesn't track or care about the
non-deposit portion.

If you want the *whole* amount collected online (no balance at the
appointment), turn on **Pay-in-full** — it sends the client a
magic link before the appointment so they can pay the balance
ahead of time.

## Can I see my charges without leaving OYRB?

Sort of. The OYRB **Bookings** page shows which bookings have a
deposit paid or are paid in full. For the actual money — exact
amounts, payout dates, fees, refunds — sign in to your Stripe
Dashboard at **dashboard.stripe.com**. Stripe's dashboard is where
the real ledger lives.

The OYRB Bookings page has a **Refund** link on every paid booking
that opens the right charge in your Stripe dashboard with one
click.

## What if Stripe pauses my account out of the blue?

Happens occasionally — Stripe is conservative about new businesses,
high-ticket services, and unusual payment patterns. If they pause
you, the OYRB **Payments** dashboard tells you exactly what they
need to lift the pause. Usually 5 minutes of paperwork.

While paused, your booking page falls back to "contact directly to
book" — clients can't pay online but can still see your services
and reach you. Existing bookings are unaffected.

## What if I close my business?

Cancel your OYRB subscription and disconnect Stripe. Your Stripe
account stays yours — keep it open as long as you want, or close
it from dashboard.stripe.com. You'll still get a 1099-K for any
year you accepted payments.

## I have a question that isn't here

Text me. Voice memo me. Email me. I read every message and these
docs grow from real questions.

— Alania
