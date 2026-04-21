import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { notifyWaitlistOnCancellation } from "@/lib/waitlist-notify";
import { sendBookingCancellation } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Fetch booking + verify ownership. We also pull the fields the
  // cancellation email needs so we don't have to re-query after the
  // status update.
  const { data: booking } = await supabase
    .from("bookings")
    .select(`
      id, business_id, service_id, start_at, status,
      businesses!inner(owner_id, business_name, slug, contact_email, phone),
      services(name),
      clients(name, email)
    `)
    .eq("id", id)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const bookingRow = booking as unknown as {
    id: string;
    business_id: string;
    service_id: string;
    start_at: string;
    status: string;
    businesses: {
      owner_id: string;
      business_name: string;
      slug: string;
      contact_email: string | null;
      phone: string | null;
    };
    services: { name: string } | null;
    clients: { name: string; email: string | null } | null;
  };

  if (bookingRow.businesses?.owner_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (bookingRow.status === "cancelled") {
    return NextResponse.json({ ok: true, already_cancelled: true });
  }

  // Mark cancelled, with audit fields so we can tell pro- vs client-
  // initiated cancels apart later (needed for refund policy + analytics).
  const admin = createAdminClient();
  const { error: updErr } = await admin
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_by: "pro",
    })
    .eq("id", id);
  if (updErr) {
    console.error("Pro cancel update failed:", updErr);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  // Email the client that their booking was cancelled. Best-effort —
  // failures are logged but don't undo the cancel.
  if (bookingRow.clients?.email && bookingRow.services?.name) {
    await sendBookingCancellation({
      to: bookingRow.clients.email,
      customerName: bookingRow.clients.name,
      businessName: bookingRow.businesses.business_name,
      serviceName: bookingRow.services.name,
      startAt: new Date(bookingRow.start_at),
      cancelledBy: "pro",
      contactEmail: bookingRow.businesses.contact_email,
      contactPhone: bookingRow.businesses.phone,
      siteUrl: `${APP_URL}/s/${bookingRow.businesses.slug}`,
    }).catch((e) => console.error("Client cancel email failed:", e));
  }

  // Fire waitlist notification — some plans offer this.
  const result = await notifyWaitlistOnCancellation({
    businessId: bookingRow.business_id,
    serviceId: bookingRow.service_id,
    startAt: new Date(bookingRow.start_at),
  });

  return NextResponse.json({ ok: true, notified: result.notified });
}
