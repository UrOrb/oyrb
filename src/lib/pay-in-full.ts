import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPaymentReceived, resend } from "@/lib/email";
import { formatCents } from "@/lib/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space";
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "OYRB <bookings@oyrb.space>";

/**
 * Webhook handler for the pay-in-full checkout session completing. Marks
 * the booking paid_in_full + emails both parties.
 *
 * Idempotent: upserts by pay_now_session_id so Stripe's retry loop on
 * 5xx responses can't double-charge-mark or double-email.
 */
export async function handlePayInFullCompleted(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const bookingId = session.metadata?.booking_id;
  const token = session.metadata?.token;
  if (!bookingId || !token) {
    console.error("pay_in_full webhook missing metadata:", session.id);
    return;
  }
  if (session.payment_status !== "paid") {
    // Could be "unpaid" (Stripe still processing) — webhook will fire
    // again. Don't stamp the booking yet.
    return;
  }

  // Idempotency: if this session already wrote the row, bail.
  const { data: existing } = await supabase
    .from("bookings")
    .select("id, pay_now_session_id, paid_in_full_at")
    .eq("id", bookingId)
    .maybeSingle();
  if (!existing) {
    console.error("pay_in_full webhook — booking not found:", bookingId);
    return;
  }
  if (existing.pay_now_session_id === session.id && existing.paid_in_full_at) {
    return;
  }

  const paidAmount = session.amount_total ?? 0;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? null;

  // stripe_payment_intent_id is only written if it isn't already set — the
  // deposit flow may have populated it with the deposit intent; we don't
  // want to clobber that audit trail. The pay-in-full intent is still
  // recoverable via pay_now_session_id → Stripe dashboard.
  const update: Record<string, unknown> = {
    paid_in_full_at: new Date().toISOString(),
    paid_amount_cents: paidAmount,
    pay_now_session_id: session.id,
  };
  if (paymentIntentId && !existing.pay_now_session_id) {
    // Only set stripe_payment_intent_id when it's empty — see comment above.
    const { data: currentRow } = await supabase
      .from("bookings")
      .select("stripe_payment_intent_id")
      .eq("id", bookingId)
      .maybeSingle();
    if (!currentRow?.stripe_payment_intent_id) {
      update.stripe_payment_intent_id = paymentIntentId;
    }
  }

  const { error: updErr } = await supabase
    .from("bookings")
    .update(update)
    .eq("id", bookingId);
  if (updErr) {
    console.error("pay_in_full update failed:", updErr);
    return;
  }

  // Best-effort notifications. If Resend hiccups, Stripe doesn't retry —
  // but the DB is already updated, so the client sees "paid" on return.
  const { data: bookingData } = await supabase
    .from("bookings")
    .select(`
      id, start_at, deposit_paid,
      services(name, price_cents, deposit_cents),
      clients(name, email),
      businesses(business_name, slug, contact_email, owner_id)
    `)
    .eq("id", bookingId)
    .maybeSingle();
  const booking = bookingData as unknown as {
    id: string;
    start_at: string;
    deposit_paid: boolean | null;
    services: { name: string; price_cents: number; deposit_cents: number | null } | null;
    clients: { name: string; email: string | null } | null;
    businesses: {
      business_name: string;
      slug: string;
      contact_email: string | null;
      owner_id: string;
    } | null;
  } | null;

  if (!booking || !booking.services || !booking.businesses || !booking.clients) {
    return;
  }

  // Client receipt.
  if (booking.clients.email) {
    await sendPaymentReceived({
      to: booking.clients.email,
      customerName: booking.clients.name,
      businessName: booking.businesses.business_name,
      serviceName: booking.services.name,
      startAt: new Date(booking.start_at),
      paidAmountCents: paidAmount,
      priceCents: booking.services.price_cents,
      depositWasPaid: !!booking.deposit_paid,
      token,
    }).catch((e) => console.error("pay_in_full client email failed:", e));
  }

  // Pro notification — resolve owner email (fallback to auth.users).
  if (resend) {
    let ownerEmail = booking.businesses.contact_email;
    if (!ownerEmail) {
      const { data: auth } = await supabase.auth.admin.getUserById(
        booking.businesses.owner_id,
      );
      ownerEmail = auth?.user?.email ?? null;
    }
    if (ownerEmail) {
      const whenLabel = new Date(booking.start_at).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ownerEmail,
          subject: `💳 ${booking.clients.name} paid ${formatCents(paidAmount)} for ${booking.services.name}`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
              <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Payment received</p>
              <h1 style="font-size:22px;font-weight:600;margin:0 0 12px;">${booking.clients.name} paid ahead.</h1>
              <div style="background:#FAFAF9;border:1px solid #E7E5E4;border-radius:12px;padding:20px;margin:20px 0;">
                <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Service</p>
                <p style="margin:0 0 14px;font-size:15px;font-weight:600;">${booking.services.name}</p>
                <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">When</p>
                <p style="margin:0 0 14px;font-size:15px;font-weight:600;">${whenLabel}</p>
                <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Amount</p>
                <p style="margin:0;font-size:18px;font-weight:600;color:#047857;">${formatCents(paidAmount)}</p>
              </div>
              <p style="color:#525252;font-size:14px;margin:0 0 16px;">Payout lands in your Stripe account on the usual schedule. No balance to collect at the appointment.</p>
              <a href="${APP_URL}/dashboard/bookings" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;">Open dashboard</a>
            </div>
          `,
        });
      } catch (e) {
        console.error("pay_in_full owner email failed:", e);
      }
    }
  }
}
