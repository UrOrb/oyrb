# Taxes and 1099-K forms

Quick read. Don't skip — this is the kind of thing that surprises
people in late January.

## What's a 1099-K?

It's a tax form from a payment processor (Stripe, in your case)
listing how much money flowed through your account that year.

You don't fill it out. They send it to you and to the IRS. You hand
it to your accountant or include it when you file your taxes.

## Who sends it to you?

**Stripe.** Not OYRB.

This is because the money flows directly from your client's card
into your Stripe account. OYRB never holds it. Stripe is the
financial entity recording your gross income, so they're the ones
who issue the form.

Same reason a Square user gets their 1099-K from Square, not from
the booking app they use — whoever owns the merchant account owns
the tax form.

## When to expect it

- Stripe issues 1099-Ks for the **prior calendar year** (e.g. all
  charges between Jan 1 and Dec 31 of last year).
- They're mailed and emailed in **late January**, with a deadline
  to send them out by January 31.
- You can also download yours any time from
  **dashboard.stripe.com** → **Reports** → **Tax forms**.

If you don't get one but you accepted payments — it's because you
were under the IRS threshold for that year. The threshold has
been moving around recently; Stripe will tell you in the dashboard
whether you're getting one or not.

## What to do with it

1. Save it with the rest of your tax documents.
2. Hand it to your accountant.
3. If you do your own taxes, the 1099-K total goes on your
   Schedule C as part of gross receipts (you'll back out refunds
   and Stripe fees as expenses).

If your accountant has questions about anything OYRB-specific,
forward them this page or have them contact me.

## "Wait, I don't want to deal with this"

Genuine question to ask yourself: would you rather we held your
clients' money on our platform and issued you a single check
monthly?

Some platforms do that. They charge a much bigger fee (often 5–10%
on top of card processing) to cover the risk. And you still get a
1099-K, just from them instead of Stripe.

The money path through OYRB is honest: it's yours from the moment
your client clicks pay. The 1099-K reflects that honesty. Every
payment processor does the same thing — Stripe, Square, Toast,
PayPal, Venmo Business.

## Bottom line

- 1099-K comes from Stripe in late January.
- Save it, give it to your accountant.
- This is normal for any business that takes online payments.
- OYRB doesn't issue you a 1099-K because the money never goes
  through us.

Questions? Text me. Tax questions specifically? Talk to your
accountant — I'm not allowed to give tax advice and you don't want
me to anyway.

— Alania
