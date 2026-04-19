import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyWaitlistOnCancellation } from "@/lib/waitlist-notify";

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

  // Fetch booking + verify ownership
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, business_id, service_id, start_at, status, businesses!inner(owner_id)")
    .eq("id", id)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const businesses = booking.businesses as unknown as { owner_id: string };
  if (businesses?.owner_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (booking.status === "cancelled") {
    return NextResponse.json({ ok: true, already_cancelled: true });
  }

  // Mark cancelled
  await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id);

  // Fire waitlist notification in background — don't block response
  const result = await notifyWaitlistOnCancellation({
    businessId: booking.business_id,
    serviceId: booking.service_id,
    startAt: new Date(booking.start_at),
  });

  return NextResponse.json({ ok: true, notified: result.notified });
}
