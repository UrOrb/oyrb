# How to set up payments on OYRB

If you want to take deposits or sell gift cards through your booking
page, you need a Stripe account connected to OYRB. Here's how that
works and how to set it up — usually 5 to 10 minutes start to finish.

## What this actually is

Stripe is the company that processes the credit card. When a client
pays, the money flows: their card → **your** Stripe account → your
bank. OYRB never touches it. We don't hold it, we don't release it,
we don't charge a fee per booking.

This is on purpose. It's your money. You see every charge, refund,
and payout in your own Stripe dashboard. If you ever leave OYRB,
your Stripe account comes with you.

## What you'll need before you start

Have these handy — Stripe will ask:

- Your **legal business name** (matches what's on your tax forms)
- **EIN** if you have one, **SSN** if you're a sole prop
- Your **business address** (a home address is fine)
- A **business bank account** (routing + account number — get them
  from your bank's app or a check)
- A **phone number** Stripe can text a verification code to
- A photo of your **driver's license or passport** (you can upload
  it from your phone during the flow)

If you don't have all of this on hand, no worries — you can leave
mid-flow and come back. Stripe holds your spot.

## The walkthrough

1. Sign in at **oyrb.space**, click **Payments** in the left sidebar.
2. Click the big **Connect Stripe** button.
3. You'll be sent to a page that looks like Stripe's site (because it
   is). Fill in your business info as you go. The required fields
   change a bit based on your business type.
4. Stripe will ask you to verify your identity — usually a phone code
   plus a photo of your ID.
5. Connect your bank account at the end. Stripe pays out to this
   account automatically.
6. When you're done, Stripe sends you back to OYRB. You should see
   **"Connected and ready"** on the Payments page.

## What happens after you're connected

The moment your Stripe says "ready," your booking page changes:

- Services with deposits start collecting them online.
- Your gift-card page goes live (if you've enabled gift cards).
- Pay-in-full magic links work for clients who want to settle ahead.

Money lands in your Stripe balance and pays out to your bank on
Stripe's normal schedule (typically 2 business days for the first
payout, then daily after that).

## Costs

- **OYRB:** $0 per transaction. The monthly subscription is the only
  fee from us.
- **Stripe:** their standard processing fee — currently **2.9% + 30¢**
  per successful charge. They take it off the top before paying you.

That's the whole arrangement. No platform fees, no application fees,
no surprises.

## A note on disconnecting

You can disconnect any time from the Payments page. That unlinks
OYRB from your Stripe account but doesn't delete the Stripe account
— it stays yours, with all your charge history. While disconnected,
your booking page falls back to "contact directly to book" for any
service that requires a deposit.

If you do disconnect and want to reconnect later, OYRB will set you
up with a fresh Stripe account rather than reusing the old one. That
keeps things tidy on Stripe's side.

## Stuck?

See **connect-troubleshooting.md** for the most common hiccups, or
text/email me directly. I read everything.

— Alania
