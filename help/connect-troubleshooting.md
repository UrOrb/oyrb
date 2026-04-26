# Stripe payment issues

The most common things that go sideways and what to do. If you don't
see your situation here, text me — I'd rather hear about it.

## "Stripe says they need more information from me"

Stripe occasionally pauses an account and asks for additional info —
this is them, not OYRB. Usually it's because:

- You hit a payout volume threshold and they need a updated SSN/EIN
  on file
- An ID photo wasn't readable
- Your business address didn't verify

**What to do:**
1. Go to **Payments** in your OYRB dashboard.
2. You'll see "Stripe paused new charges on your account" with a
   list of what's outstanding.
3. Click **Complete Stripe setup**. You'll go straight to Stripe to
   provide what they need.
4. Once you submit, Stripe usually re-enables charges within minutes.
   Your booking page reflects the change automatically.

While restricted, your booking page falls back to "contact directly"
for any service with a deposit. Existing bookings are untouched.

## "I started setup but didn't finish"

Totally fine. Stripe holds your progress.

Go to **Payments** and click **Complete Stripe setup**. You'll land
right where you left off — same forms, same data, no need to start
over. OYRB doesn't create a duplicate Stripe account; you finish the
one that already exists.

If you get a "this link expired" page from Stripe, just click back
to OYRB and tap **Complete Stripe setup** again. We'll mint you a
fresh link.

## "I want to disconnect"

Reasons people do this: changing business types, switching to a
different platform, just want a break. All fine.

**How to:**
1. **Payments** → scroll to the **Disconnect Stripe** box at the
   bottom.
2. Click **Disconnect…** then confirm.

**What happens:**
- OYRB unlinks from your Stripe account immediately.
- Your booking page stops collecting online deposits / gift cards.
- Your Stripe account itself **is not deleted**. It's still yours,
  with all your charge history. Sign in at dashboard.stripe.com any
  time to see it.
- Existing bookings with deposits already paid: those clients still
  show up at the salon. The deposit money is in your Stripe account
  and pays out normally.

You can reconnect later, but it'll be a fresh Stripe account, not
the old one. (Stripe doesn't let platforms "re-link" to old
accounts — that's their security model, not ours.)

## "My client tried to pay and it failed"

A few possible causes — usually not OYRB:

**Card declined.** Stripe shows the reason ("insufficient funds,"
"expired," etc.) on the checkout page. The client picks another
card and tries again. No charge actually went through.

**3-D Secure didn't complete.** Some banks send a verification text
or app push during checkout. If the client closes the tab before
finishing, the payment isn't captured. They can retry from the same
booking link.

**"Online payment isn't available" message.** Means your Stripe is
either restricted or disconnected. Check the **Payments** dashboard
in OYRB — the banner at the top will tell you exactly what's wrong.

**The client says they were charged but you don't see the booking.**
Rare, but worth checking. Send me a screenshot of the client's
charge confirmation. I have an audit log of every Stripe event
that's hit OYRB and can find what happened in a minute.

## "Where's my money?"

Always in your Stripe balance, paying out to the bank account you
linked during setup. Sign in at **dashboard.stripe.com** to see:

- **Balance** — what's processed but not yet paid out
- **Payouts** — what's already gone to your bank, when, and the next
  scheduled payout date

OYRB has zero control over the payout schedule. Stripe sets it based
on your account history (typically T+2 for new accounts, T+1 once
you have a track record).

If your bank account changed, update it in the Stripe dashboard
directly — not in OYRB. We don't store it.

## "How do I refund a client?"

OYRB doesn't process refunds. The money is in *your* Stripe account,
so you issue refunds from your own Stripe Dashboard.

**Easy way:**
1. In OYRB, go to **Bookings**.
2. Find the booking → click the **Refund** link on that row.
3. You'll land on the exact Stripe payment for that booking.
4. Click **Refund** in Stripe → choose full or partial → confirm.

**What you'll see in OYRB after the refund:**
- The booking row stays. We don't auto-cancel it on a refund.
- You'll get an email from us confirming the refund went through.
- If you also want to cancel the appointment, cancel it separately
  from OYRB's Bookings page.

Refunds usually land back on the client's card in 5–10 business days
— that's their bank's timeline, not Stripe's.

## "A client opened a chargeback"

Stripe will email you and OYRB will too. The dispute lives entirely
in your Stripe Dashboard — there's a "Submit evidence" deadline,
usually 7–14 days. **Submitting nothing means losing the dispute by
default.**

What we recommend submitting:
- The booking confirmation email (proof they booked)
- Your cancellation policy if they no-showed
- Any communication you had with them
- Photos of the work if they claim it wasn't delivered

Open the dispute from your Stripe Dashboard and follow Stripe's
prompts. They walk you through the format.

OYRB doesn't represent you in disputes — it's between the client,
their bank, and Stripe. We will email-nudge you so you don't miss
the deadline.
