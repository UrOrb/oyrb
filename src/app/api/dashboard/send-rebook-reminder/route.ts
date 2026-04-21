import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { sendRebookReminder } from "@/lib/email";
import { issueBookingToken } from "@/lib/booking-tokens";
import { canSendRebookReminder } from "@/lib/comm-preferences";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.oyrb.space";

// Pro-initiated "Send rebook reminder now" button. Authorized via logged-in
// user; we verify the client belongs to a business the pro owns before
// sending anything.
export async function POST(request: NextRequest) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { client_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.client_id) {
    return NextResponse.json({ error: "Missing client_id" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Resolve the client + business, then confirm ownership.
  const { data: row } = await admin
    .from("clients")
    .select(`
      id, name, email, business_id,
      businesses(id, owner_id, business_name, slug)
    `)
    .eq("id", body.client_id)
    .maybeSingle();

  const client = row as unknown as {
    id: string;
    name: string;
    email: string | null;
    business_id: string;
    businesses: { id: string; owner_id: string; business_name: string; slug: string } | null;
  } | null;

  if (!client || !client.businesses) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  if (client.businesses.owner_id !== user.id) {
    return NextResponse.json({ error: "Not your client" }, { status: 403 });
  }
  if (!client.email) {
    return NextResponse.json({ error: "This client has no email" }, { status: 400 });
  }

  const allowed = await canSendRebookReminder(client.email);
  if (!allowed) {
    return NextResponse.json(
      { error: "This client has unsubscribed from rebook reminders." },
      { status: 409 }
    );
  }

  // Most recent confirmed booking drives the "days since" copy + token.
  const { data: lastBooking } = await admin
    .from("bookings")
    .select(`
      id, end_at,
      services(name)
    `)
    .eq("client_id", client.id)
    .neq("status", "cancelled")
    .order("end_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const last = lastBooking as unknown as {
    id: string;
    end_at: string;
    services: { name: string } | null;
  } | null;

  if (!last || !last.services) {
    return NextResponse.json({ error: "No previous bookings to reference" }, { status: 400 });
  }

  const tk = await issueBookingToken({
    bookingId: last.id,
    clientEmail: client.email,
    ttlDays: 30,
  });
  if (!tk.ok) {
    return NextResponse.json({ error: "Rate limited — try again later." }, { status: 429 });
  }

  const daysSince = Math.floor(
    (Date.now() - new Date(last.end_at).getTime()) / (24 * 60 * 60 * 1000)
  );

  await sendRebookReminder({
    to: client.email,
    customerName: client.name,
    businessName: client.businesses.business_name,
    serviceName: last.services.name,
    daysSince: Math.max(daysSince, 1),
    siteUrl: `${APP_URL}/s/${client.businesses.slug}`,
    preferencesToken: tk.token,
  });

  return NextResponse.json({
    ok: true,
    to: client.email,
    clientName: client.name,
  });
}
