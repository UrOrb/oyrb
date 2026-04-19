import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { verifySessionToken, CLIENT_SESSION_COOKIE } from "@/lib/client-auth";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await cookies();
  const email = await verifySessionToken(c.get(CLIENT_SESSION_COOKIE)?.value);
  if (!email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Verify the booking belongs to this client's email
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, start_at, clients!inner(email)")
    .eq("id", id)
    .eq("clients.email", email)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.status === "cancelled") {
    return NextResponse.json({ error: "Already cancelled" }, { status: 409 });
  }

  const startAt = new Date(booking.start_at);
  if (startAt <= new Date()) {
    return NextResponse.json({ error: "Can't cancel a past appointment" }, { status: 400 });
  }

  await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);

  return NextResponse.json({ success: true });
}
