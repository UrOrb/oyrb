import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { resolveToken } from "@/lib/booking-tokens";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";

/**
 * Starts a Stripe Checkout Session for the pre-appointment "pay in full"
 * (or "pay the remaining balance") flow. Authorized entirely by the
 * magic-link token — no login needed.
 *
 * The webhook at /api/stripe/webhook completes the loop: when
 * checkout.session.completed arrives with metadata.booking_type ===
 * "pay_in_full", it stamps the booking with paid_in_full_at and emails
 * both parties.
 */
export async function POST(request: NextRequest) {
  if (process.env.PAY_NOW_ENABLED !== "true") {
    return NextResponse.json({ error: "Pay-now is not enabled" }, { status: 404 });
  }

  const ip = ipFromRequest(request);
  const hit = rateLimit(`paycheckout:${ip}`, 10, 60_000);
  if (!hit.ok) {
    return NextResponse.json(
      { error: "Too many checkout attempts — wait a minute." },
      { status: 429 },
    );
  }

  let body: { token?: string; tip_cents?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  // Tip normalization — clamp to [0, $500]. Anything higher is almost
  // certainly a crafted request rather than a real generous tip.
  const tipCentsRaw = Math.floor(Number(body.tip_cents ?? 0));
  const tipCents = Number.isFinite(tipCentsRaw)
    ? Math.max(0, Math.min(tipCentsRaw, 500 * 100))
    : 0;

  const resolved = await resolveToken(body.token);
  if (!resolved || resolved.expired) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data: bookingRow } = await supabase
    .from("bookings")
    .select(`
      id, business_id, start_at, status, deposit_paid,
      paid_in_full_at,
      services(name, price_cents, deposit_cents),
      clients(name, email),
      businesses(business_name, slug)
    `)
    .eq("id", resolved.bookingId)
    .maybeSingle();

  const booking = bookingRow as unknown as {
    id: string;
    business_id: string;
    start_at: string;
    status: string;
    deposit_paid: boolean | null;
    paid_in_full_at: string | null;
    services: { name: string; price_cents: number; deposit_cents: number | null } | null;
    clients: { name: string; email: string | null } | null;
    businesses: { business_name: string; slug: string } | null;
  } | null;

  if (!booking || !booking.services || !booking.businesses || !booking.clients) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "Booking is cancelled" }, { status: 409 });
  }
  if (booking.paid_in_full_at) {
    return NextResponse.json({ error: "Already paid in full" }, { status: 409 });
  }

  const depositCents =
    booking.deposit_paid ? (booking.services.deposit_cents ?? 0) : 0;
  const balanceCents = Math.max(0, booking.services.price_cents - depositCents);
  if (balanceCents <= 0) {
    return NextResponse.json({ error: "No balance to collect" }, { status: 409 });
  }

  // Amount invariant: never charge more than (service price + the
  // pre-clamped tip cap). If the client sends a tip higher than the
  // service price we still clamp to $500 above, which is the generous
  // hard cap — but we also refuse if the tip would exceed the service
  // total, to keep the charge profile normal-looking.
  if (tipCents > booking.services.price_cents) {
    return NextResponse.json(
      { error: "Tip can't exceed the service price." },
      { status: 400 },
    );
  }
  const totalCents = balanceCents + tipCents;
  // Stripe hard minimum (USD, non-decimal).
  if (totalCents < 50) {
    return NextResponse.json(
      { error: "Minimum charge is $0.50." },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;
  const successUrl = `${origin}/booking/${resolved.token}/pay/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/booking/${resolved.token}/pay`;

  const whenLabel = new Date(booking.start_at).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: booking.clients.email ?? undefined,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: balanceCents,
            product_data: {
              name: booking.deposit_paid
                ? `Balance — ${booking.services.name}`
                : `${booking.services.name} (paid in full)`,
              description: `${booking.businesses.business_name} · ${whenLabel}`,
            },
          },
        },
        ...(tipCents > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: "usd",
                  unit_amount: tipCents,
                  product_data: {
                    name: "Tip",
                    description: `Gratuity for ${booking.businesses.business_name}`,
                  },
                },
              },
            ]
          : []),
      ],
      // Webhook discriminator — must match the type-check in webhook/route.ts.
      metadata: {
        booking_type: "pay_in_full",
        booking_id: booking.id,
        token: resolved.token,
        balance_cents: String(balanceCents),
        tip_cents: String(tipCents),
        total_cents: String(totalCents),
        deposit_was_paid: String(!!booking.deposit_paid),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Pay-in-full checkout session failed:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Couldn't start checkout: ${msg}` },
      { status: 500 },
    );
  }
}
