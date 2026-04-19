import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let body: { booking_id?: string; rating?: number; comment?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const bookingId = (body.booking_id ?? "").trim();
  const rating = Math.min(5, Math.max(1, Math.round(Number(body.rating ?? 0))));
  const comment = (body.comment ?? "").trim().slice(0, 1200);

  if (!bookingId || !rating) {
    return NextResponse.json({ error: "Missing booking id or rating" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Look up booking and verify it exists + client info
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, business_id, client_id, clients(name), status")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const clientName = (booking as { clients?: { name?: string } | null }).clients?.name ?? "Anonymous";

  // Prevent duplicate reviews per booking
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "You already submitted a review for this appointment." }, { status: 409 });
  }

  const { error } = await supabase.from("reviews").insert({
    business_id: booking.business_id,
    booking_id: booking.id,
    client_id: booking.client_id,
    client_name: clientName,
    rating,
    comment: comment || null,
    approved: true,
  });

  if (error) {
    console.error("Review insert error:", error);
    return NextResponse.json({ error: "Could not save review right now." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
