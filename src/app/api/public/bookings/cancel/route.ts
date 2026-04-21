import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveToken } from "@/lib/booking-tokens";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";
import { sendBookingCancellation, resend } from "@/lib/email";

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "OYRB <bookings@oyrb.space>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space";

// Client-initiated cancellation via a magic-link token. No auth beyond
// the token itself — the token IS the auth, scoped to this booking only.
export async function POST(request: NextRequest) {
  const ip = ipFromRequest(request);
  const limit = rateLimit(`cancel:${ip}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many attempts. Wait a minute." }, { status: 429 });
  }

  let body: { token?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body.token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const resolved = await resolveToken(body.token);
  if (!resolved || resolved.expired) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      id, status, start_at, business_id,
      businesses(business_name, slug, contact_email, phone, owner_id),
      services(name),
      clients(name, email)
    `)
    .eq("id", resolved.bookingId)
    .maybeSingle();

  const bookingRow = booking as unknown as {
    id: string;
    status: string;
    start_at: string;
    business_id: string;
    businesses: {
      business_name: string;
      slug: string;
      contact_email: string | null;
      phone: string | null;
      owner_id: string;
    } | null;
    services: { name: string } | null;
    clients: { name: string; email: string | null } | null;
  } | null;

  if (!bookingRow) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }
  if (bookingRow.status === "cancelled") {
    return NextResponse.json({ ok: true, already_cancelled: true });
  }

  const reason = (body.reason ?? "").slice(0, 500) || null;
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: "client",
      cancel_reason: reason,
    })
    .eq("id", resolved.bookingId);

  if (error) {
    console.error("Cancel update failed:", error);
    return NextResponse.json({ error: "Couldn't cancel — try contacting the pro directly." }, { status: 500 });
  }

  // Best-effort notifications. Failure here must not undo the cancel —
  // the client has already committed to the decision.
  if (bookingRow.businesses && bookingRow.services) {
    const tasks: Promise<unknown>[] = [];

    // Self-copy to the client so they have a record outside our UI.
    if (bookingRow.clients?.email) {
      tasks.push(
        sendBookingCancellation({
          to: bookingRow.clients.email,
          customerName: bookingRow.clients.name,
          businessName: bookingRow.businesses.business_name,
          serviceName: bookingRow.services.name,
          startAt: new Date(bookingRow.start_at),
          cancelledBy: "client",
          reason,
          contactEmail: bookingRow.businesses.contact_email,
          contactPhone: bookingRow.businesses.phone,
          siteUrl: `${APP_URL}/s/${bookingRow.businesses.slug}`,
        }).catch((e) => console.error("Client self-copy cancel email failed:", e)),
      );
    }

    // Notify the pro so they can see the cancellation outside the dashboard.
    if (resend) {
      let ownerEmail = bookingRow.businesses.contact_email;
      if (!ownerEmail) {
        const { data: auth } = await supabase.auth.admin.getUserById(bookingRow.businesses.owner_id);
        ownerEmail = auth?.user?.email ?? null;
      }
      if (ownerEmail) {
        const whenLabel = new Date(bookingRow.start_at).toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        const customerName = bookingRow.clients?.name ?? "A client";
        tasks.push(
          resend.emails.send({
            from: FROM_EMAIL,
            to: ownerEmail,
            subject: `${customerName} cancelled — ${bookingRow.services.name}`,
            html: `
              <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#0A0A0A;">
                <p style="color:#B8896B;font-size:13px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;margin:0 0 8px;">Cancellation notice</p>
                <h1 style="font-size:22px;font-weight:600;margin:0 0 12px;">${customerName} cancelled their booking.</h1>
                <div style="background:#FAFAF9;border:1px solid #E7E5E4;border-radius:12px;padding:20px;margin:20px 0;">
                  <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Service</p>
                  <p style="margin:0 0 14px;font-size:15px;font-weight:600;">${bookingRow.services.name}</p>
                  <p style="margin:0 0 4px;color:#737373;font-size:12px;text-transform:uppercase;letter-spacing:.05em;">Was scheduled for</p>
                  <p style="margin:0;font-size:15px;font-weight:600;text-decoration:line-through;color:#A3A3A3;">${whenLabel}</p>
                </div>
                ${reason ? `<p style="color:#525252;font-size:13px;margin:0 0 16px;"><strong>Reason:</strong> ${reason}</p>` : ""}
                <a href="${APP_URL}/dashboard/bookings" style="display:inline-block;background:#0A0A0A;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;">Open dashboard</a>
              </div>
            `,
          }).catch((e) => console.error("Owner cancel notice failed:", e)),
        );
      }
    }

    await Promise.all(tasks);
  }

  return NextResponse.json({ ok: true });
}
