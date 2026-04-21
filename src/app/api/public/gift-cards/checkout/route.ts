import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";

const MIN_AMOUNT_CENTS = 500;      // $5 floor (above Stripe's $0.50)
const MAX_AMOUNT_CENTS = 100_000;  // $1,000 ceiling — prevents runaway custom amounts

/**
 * Public gift-card purchase. Uses the pro's slug to find the business,
 * creates a Stripe Checkout session, stashes buyer/recipient/message
 * in session.metadata. The /api/stripe/webhook handler routes
 * checkout.session.completed with booking_type="gift_card" to the
 * handler that inserts the row + emails everyone.
 *
 * The gift card ROW is NOT created here — only at webhook time, so a
 * Stripe card-decline on the hosted page never leaves an orphan record.
 */
export async function POST(request: NextRequest) {
  const ip = ipFromRequest(request);
  const hit = rateLimit(`giftcheckout:${ip}`, 8, 60_000);
  if (!hit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a minute." },
      { status: 429 },
    );
  }

  let body: {
    slug?: string;
    amount_cents?: number;
    buyer_name?: string;
    buyer_email?: string;
    recipient_name?: string | null;
    recipient_email?: string | null;
    message?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim();
  const buyerName = (body.buyer_name ?? "").trim();
  const buyerEmail = (body.buyer_email ?? "").trim().toLowerCase();
  const amountCentsRaw = Math.floor(Number(body.amount_cents ?? 0));

  if (!slug || !buyerName || !buyerEmail) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!Number.isFinite(amountCentsRaw) || amountCentsRaw < MIN_AMOUNT_CENTS) {
    return NextResponse.json(
      { error: `Minimum gift card is $${MIN_AMOUNT_CENTS / 100}.` },
      { status: 400 },
    );
  }
  if (amountCentsRaw > MAX_AMOUNT_CENTS) {
    return NextResponse.json(
      { error: `Maximum gift card is $${MAX_AMOUNT_CENTS / 100}.` },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data: biz } = await supabase
    .from("businesses")
    .select("id, business_name, slug, owner_id, is_published")
    .eq("slug", slug)
    .maybeSingle();
  if (!biz || !biz.is_published) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const successUrl = `${origin}/s/${slug}/gift-cards/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/s/${slug}/gift-cards`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: buyerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCentsRaw,
            product_data: {
              // Generic line-item label so the pro's business_name (which can
              // be a personal name like "Halania Dixon") doesn't surface on
              // Stripe's hosted checkout page or the bank-statement
              // descriptor. Pro identity is preserved in metadata.business_id
              // for the webhook to route the funds + email correctly.
              name: "OYRB Gift Card",
              description: "Redeemable on oyrb.space",
            },
          },
        },
      ],
      metadata: {
        // Discriminator the webhook uses to route to handleGiftCardCompleted
        booking_type: "gift_card",
        business_id: biz.id,
        pro_user_id: biz.owner_id,
        amount_cents: String(amountCentsRaw),
        buyer_name: buyerName.slice(0, 120),
        buyer_email: buyerEmail,
        recipient_name: (body.recipient_name ?? "").slice(0, 120),
        recipient_email: (body.recipient_email ?? "").trim().toLowerCase().slice(0, 240),
        message: (body.message ?? "").slice(0, 280),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Gift-card checkout session failed:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Couldn't start checkout: ${msg}` },
      { status: 500 },
    );
  }
}
