import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";

type Payload = {
  business_id: string;
  service_id: string;
  start_at: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  sms_consent?: boolean;
  marketing_opt_in?: boolean;
  tip_cents?: number;
  series_interval_weeks?: number | null;
  series_occurrences?: number | null;
  age_confirmed?: boolean;
  age_is_minor?: boolean;
  guardian_name?: string;
};

// Creates a Stripe Checkout Session to collect the deposit.
// Booking isn't created yet — it's created in /api/public/bookings/confirm
// after Stripe redirects back with a paid session_id.
export async function POST(request: NextRequest) {
  const ip = ipFromRequest(request);
  const minute = rateLimit(`deposit:m:${ip}`, 6, 60_000);
  const hour = rateLimit(`deposit:h:${ip}`, 30, 60 * 60_000);
  if (!minute.ok || !hour.ok) {
    return NextResponse.json(
      { error: "Too many checkout attempts — please slow down." },
      { status: 429 }
    );
  }

  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.business_id || !body.service_id || !body.start_at || !body.name || !body.email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!body.age_confirmed) {
    return NextResponse.json({ error: "Age confirmation is required to book." }, { status: 400 });
  }
  if (body.age_is_minor && !(body.guardian_name && body.guardian_name.trim().length >= 2)) {
    return NextResponse.json({ error: "Parent or guardian name is required for minors." }, { status: 400 });
  }

  body.email = body.email.toLowerCase();

  const supabase = createAdminClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, business_name, slug, is_published, subscription_tier")
    .eq("id", body.business_id)
    .maybeSingle();
  if (!business || !business.is_published) {
    return NextResponse.json({ error: "Business not accepting bookings" }, { status: 404 });
  }

  const { data: service } = await supabase
    .from("services")
    .select("id, name, price_cents, deposit_cents, duration_minutes")
    .eq("id", body.service_id)
    .eq("business_id", body.business_id)
    .eq("active", true)
    .maybeSingle();
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  if (!service.deposit_cents || service.deposit_cents <= 0) {
    return NextResponse.json({ error: "This service does not require a deposit" }, { status: 400 });
  }

  const startAt = new Date(body.start_at);
  if (isNaN(startAt.getTime()) || startAt < new Date()) {
    return NextResponse.json({ error: "Invalid booking time" }, { status: 400 });
  }
  const endAt = new Date(startAt.getTime() + service.duration_minutes * 60_000);

  // Check for overlap (someone else might have booked while this user was deciding)
  const { data: overlap } = await supabase
    .from("bookings")
    .select("id")
    .eq("business_id", body.business_id)
    .neq("status", "cancelled")
    .lt("start_at", endAt.toISOString())
    .gt("end_at", startAt.toISOString())
    .limit(1);
  if (overlap && overlap.length > 0) {
    return NextResponse.json(
      { error: "That time was just booked. Please pick another." },
      { status: 409 }
    );
  }

  const origin = new URL(request.url).origin;
  const successUrl = `${origin}/s/${business.slug}/booking-confirmed?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/s/${business.slug}`;

  const tipCents = Math.max(0, Math.floor(body.tip_cents ?? 0));

  const lineItems: Array<{ price_data: { currency: string; product_data: { name: string; description?: string }; unit_amount: number }; quantity: number }> = [
    {
      price_data: {
        currency: "usd",
        product_data: {
          name: `Deposit — ${service.name}`,
          description: `${business.business_name} · ${startAt.toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}`,
        },
        unit_amount: service.deposit_cents,
      },
      quantity: 1,
    },
  ];

  if (tipCents > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: "Tip",
          description: `Gratuity for ${business.business_name}`,
        },
        unit_amount: tipCents,
      },
      quantity: 1,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      customer_email: body.email,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        booking_type: "deposit",
        business_id: body.business_id,
        service_id: body.service_id,
        start_at: body.start_at,
        name: body.name,
        email: body.email,
        phone: body.phone ?? "",
        notes: body.notes?.slice(0, 400) ?? "",
        sms_consent: String(body.sms_consent ?? false),
        marketing_opt_in: String(!!body.marketing_opt_in),
        tip_cents: String(tipCents),
        series_interval_weeks: String(body.series_interval_weeks ?? 0),
        series_occurrences: String(body.series_occurrences ?? 1),
        age_confirmed: "true",
        age_is_minor: String(!!body.age_is_minor),
        guardian_name: body.age_is_minor ? (body.guardian_name?.trim().slice(0, 120) ?? "") : "",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Deposit checkout error:", err);
    return NextResponse.json(
      { error: "Could not start deposit checkout" },
      { status: 500 }
    );
  }
}
