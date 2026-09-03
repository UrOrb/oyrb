import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";
import { handlePayInFullCompleted } from "@/lib/pay-in-full";
import { handleGiftCardCompleted } from "@/lib/gift-cards";
import { refreshAccountStatus } from "@/lib/stripe-connect";
import {
  checkAndReserveConnectEvent,
  markConnectEventCompleted,
} from "@/lib/stripe-connect-events";
import { resend } from "@/lib/email";
import { getFromAddress, EmailPurpose } from "@/lib/email-from";
import { formatCents } from "@/lib/types";
import { reportError, reportWarning } from "@/lib/monitoring";
import type Stripe from "stripe";

/**
 * Stripe Connect webhook endpoint. Distinct from /api/stripe/webhook
 * (which handles platform/subscription events) — this URL is registered
 * in Stripe Dashboard as a Connect endpoint with its own signing secret
 * (STRIPE_CONNECT_WEBHOOK_SECRET).
 *
 * Why two endpoints rather than one with dual secrets:
 *   - Signature verification is unambiguous: one secret per URL, fail loud
 *     when wrong instead of trying both keys per request.
 *   - Idempotency lives in different tables (processed_webhook_events vs
 *     stripe_connect_events) and the handlers diverge meaningfully —
 *     platform updates account_subscriptions, Connect updates
 *     bookings/gift_cards/businesses.
 *   - Easier to disable independently if one side has a bug, and the
 *     stripe_connect_events table doubles as a per-pro audit log.
 *
 * Subscribed events (configure in Stripe Dashboard → Connect → Webhooks):
 *
 *   checkout.session.completed       — completes pay-in-full / gift-card
 *   payment_intent.succeeded         — confirms payment captured (audit)
 *   payment_intent.payment_failed    — failed charge (audit)
 *   charge.refunded                  — pro issued a refund from Stripe
 *   charge.dispute.created           — chargeback opened
 *   account.updated                  — sync charges/payouts/requirements
 *   account.application.deauthorized — pro disconnected from Stripe side
 */
export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!secret) {
    reportError("connect_webhook_secret_missing", new Error("STRIPE_CONNECT_WEBHOOK_SECRET not configured"));
    console.error("STRIPE_CONNECT_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Connect webhook not configured" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    reportWarning("connect_webhook_signature_verification_failed", err instanceof Error ? err.message : "signature verification failed");
    console.error("Connect webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Connect events always carry event.account — the acct_… that originated
  // the event. If it's missing, this delivery was misrouted (probably a
  // platform event hitting the Connect endpoint).
  const accountId = event.account;
  if (!accountId) {
    console.warn(
      `[connect-webhook] ${event.id} (${event.type}) missing event.account — refusing`,
    );
    return NextResponse.json(
      { error: "Connect event missing account" },
      { status: 400 },
    );
  }

  const t0 = Date.now();
  console.log(
    `[connect-webhook] received ${event.id} (${event.type}) for ${accountId}`,
  );

  let reservation;
  try {
    reservation = await checkAndReserveConnectEvent(
      event.id,
      event.type,
      accountId,
      event.data.object,
    );
  } catch (err) {
    reportError("connect_webhook_reservation_failed", err, {
      event_id: event.id,
      event_type: event.type,
      account_id: accountId,
    });
    console.error(
      `[connect-webhook] reservation failed for ${event.id}:`,
      err,
    );
    return NextResponse.json(
      { error: "Idempotency store unavailable" },
      { status: 500 },
    );
  }

  if (!reservation.proceed) {
    console.log(
      `[connect-webhook] ${event.id} (${event.type}) DUPLICATE — skipping`,
    );
    return NextResponse.json({ received: true, idempotent: true });
  }

  console.log(
    `[connect-webhook] ${event.id} (${event.type}) ${reservation.reason.toUpperCase()} — processing`,
  );

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Route by booking_type metadata, same discriminator as platform
        // webhook. Deposits complete via /api/public/bookings/confirm on
        // the redirect; here we only log them as the safety-net audit row.
        const bookingType = session.metadata?.booking_type;
        if (bookingType === "pay_in_full") {
          await handlePayInFullCompleted(supabase, session);
        } else if (bookingType === "gift_card") {
          await handleGiftCardCompleted(supabase, session);
        } else if (bookingType === "deposit") {
          await confirmDepositBookingFromWebhook(session.id, accountId);
        }
        // unknown → ignored. Either way the stripe_connect_events row already
        // captured the payload for audit.
        break;
      }

      case "payment_intent.succeeded":
      case "payment_intent.payment_failed": {
        // Audit-only. The booking truth lives in checkout.session.completed
        // (which carries our metadata). Logging the PI event is enough for
        // forensic reconciliation later.
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await notifyProOfRefund(supabase, accountId, charge);
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        await notifyProOfDispute(supabase, accountId, dispute);
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        // Resolve businessId from the account, then reuse the existing
        // helper that pulls from Stripe + writes back the columns. Stripe's
        // payload already carries the values we need, but going through
        // the helper keeps this one source of truth.
        //
        // Race window (documented in STRIPE_SETUP.md §E.3): there is an
        // unavoidable gap between Stripe flipping a flag (e.g. enabling /
        // disabling charges) and our DB reflecting the change. During that
        // window the pre-flight `loadConnectAccountForCheckout` may allow
        // or refuse a charge that Stripe itself would decide differently.
        // Stripe is the ultimate source of truth — a charge that pre-flight
        // allows during the window will still be accepted/rejected by
        // Stripe per the live state of the connected account, so funds
        // never end up in a bad state. Worst case is a momentary UX gap.
        const { data: biz } = await supabase
          .from("businesses")
          .select("id")
          .eq("stripe_connect_account_id", account.id)
          .maybeSingle();
        if (biz?.id) {
          await refreshAccountStatus({
            businessId: biz.id,
            accountId: account.id,
          });
        } else {
          // Stripe sent us an update for an account we don't know about.
          // Most likely the pro disconnected via OYRB and Stripe is still
          // streaming events for ~1 webhook delivery. Logged in
          // stripe_connect_events; nothing else to do.
          console.warn(
            `[connect-webhook] account.updated for unknown account ${account.id}`,
          );
        }
        break;
      }

      case "account.application.deauthorized": {
        // The pro revoked OYRB's access from inside dashboard.stripe.com.
        // Mirror the soft-disconnect flow: clear our pointer + flags so
        // the dashboard surfaces "Connect again", and the public-facing
        // payment routes start failing the pre-flight gate immediately.
        const { error } = await supabase
          .from("businesses")
          .update({
            stripe_connect_account_id: null,
            stripe_connect_onboarding_complete: false,
            stripe_connect_charges_enabled: false,
            stripe_connect_payouts_enabled: false,
            stripe_connect_details_submitted: false,
            stripe_connect_requirements_currently_due: null,
          })
          .eq("stripe_connect_account_id", accountId);
        if (error) {
          throw new Error(
            `Failed to clear connect columns for ${accountId}: ${error.message}`,
          );
        }
        break;
      }

      default: {
        // Unsubscribed event type leaked through — log and accept.
        console.warn(
          `[connect-webhook] unhandled event type ${event.type} for ${accountId}`,
        );
      }
    }

    await markConnectEventCompleted(event.id, true);
    console.log(
      `[connect-webhook] ${event.id} (${event.type}) SUCCESS in ${Date.now() - t0}ms`,
    );
    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error
      ? `${err.message}\n${err.stack ?? ""}`.slice(0, 4000)
      : String(err).slice(0, 4000);
    await markConnectEventCompleted(event.id, false, message).catch((e) => {
      console.error(
        `[connect-webhook] failed to mark ${event.id} as failed:`,
        e,
      );
    });
    reportError("connect_webhook_processing_failed", err, {
      event_id: event.id,
      event_type: event.type,
      account_id: accountId,
      duration_ms: Date.now() - t0,
    });
    console.error(
      `[connect-webhook] ${event.id} (${event.type}) FAILED in ${Date.now() - t0}ms:`,
      err,
    );
    // 500 → Stripe retries; the next attempt sees status='failed' in our
    // ledger and reason="retry", so the handler runs again.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }
}

async function confirmDepositBookingFromWebhook(
  sessionId: string,
  connectedAccountId: string,
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is required to confirm deposit bookings from webhook");
  }

  const res = await fetch(`${appUrl.replace(/\/$/, "")}/api/public/bookings/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      connected_account_id: connectedAccountId,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // A paid deposit can legitimately be unable to create a booking if
    // the slot was taken while the client was in Checkout. /confirm now
    // performs an idempotent automatic refund in that case. Treat that
    // remediated state as handled so Stripe does not retry forever.
    if (res.status === 409 && body.includes("automatically refunded")) {
      console.warn(
        `[connect-webhook] deposit ${sessionId} could not create booking; automatic refund issued`,
      );
      return;
    }
    throw new Error(
      `Deposit booking confirmation failed for ${sessionId}: HTTP ${res.status} ${body.slice(0, 500)}`,
    );
  }
}

// ── notifiers ─────────────────────────────────────────────────────────────
// Refund + dispute UIs are intentionally not built in OYRB — pros operate
// those flows from dashboard.stripe.com directly. We just send a heads-up
// email so they don't have to live in the Stripe dashboard.

async function notifyProOfRefund(
  supabase: ReturnType<typeof createAdminClient>,
  accountId: string,
  charge: Stripe.Charge,
): Promise<void> {
  const ownerEmail = await resolveOwnerEmailByAccount(supabase, accountId);
  if (!ownerEmail || !resend) return;

  const refundedAmount = charge.amount_refunded ?? 0;
  try {
    await resend.emails.send({
      from: getFromAddress(EmailPurpose.PAYMENT),
      to: ownerEmail,
      subject: `Refund issued — ${formatCents(refundedAmount)}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
          <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Refund</p>
          <h1 style="font-size:22px;font-weight:600;margin:0 0 12px;">A refund of ${formatCents(refundedAmount)} was issued.</h1>
          <p style="color:#525252;font-size:14px;line-height:1.5;margin:0 0 16px;">
            Stripe processed a refund on charge <code>${charge.id}</code>. Your Stripe Dashboard has the full record — the original payout (if already sent) will be reduced on a future date.
          </p>
          <p style="color:#737373;font-size:13px;margin:0;">No action needed from OYRB; the booking row is unchanged. If this was unexpected, contact Stripe support.</p>
        </div>
      `,
    });
  } catch (e) {
    console.error("Refund email failed:", e);
  }
}

async function notifyProOfDispute(
  supabase: ReturnType<typeof createAdminClient>,
  accountId: string,
  dispute: Stripe.Dispute,
): Promise<void> {
  const ownerEmail = await resolveOwnerEmailByAccount(supabase, accountId);
  if (!ownerEmail || !resend) return;

  try {
    await resend.emails.send({
      from: getFromAddress(EmailPurpose.PAYMENT),
      to: ownerEmail,
      subject: `⚠️ Chargeback opened — ${formatCents(dispute.amount)}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
          <p style="color:#DC2626;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Action needed</p>
          <h1 style="font-size:22px;font-weight:600;margin:0 0 12px;">A chargeback was opened for ${formatCents(dispute.amount)}.</h1>
          <p style="color:#525252;font-size:14px;line-height:1.5;margin:0 0 16px;">
            Reason: <strong>${dispute.reason ?? "unspecified"}</strong>. You have until the <strong>evidence due-by</strong> date in your Stripe Dashboard to respond. Failing to respond loses the dispute by default.
          </p>
          <p style="color:#525252;font-size:14px;line-height:1.5;margin:0 0 16px;">
            Submit your evidence directly in your Stripe Dashboard — OYRB does not handle disputes on your behalf.
          </p>
          <a href="https://dashboard.stripe.com/disputes/${dispute.id}" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;">Open in Stripe</a>
        </div>
      `,
    });
  } catch (e) {
    console.error("Dispute email failed:", e);
  }
}

async function resolveOwnerEmailByAccount(
  supabase: ReturnType<typeof createAdminClient>,
  accountId: string,
): Promise<string | null> {
  const { data: biz } = await supabase
    .from("businesses")
    .select("contact_email, owner_id")
    .eq("stripe_connect_account_id", accountId)
    .maybeSingle();
  if (!biz) return null;
  if (biz.contact_email) return biz.contact_email as string;
  const { data: auth } = await supabase.auth.admin.getUserById(biz.owner_id);
  return auth?.user?.email ?? null;
}
