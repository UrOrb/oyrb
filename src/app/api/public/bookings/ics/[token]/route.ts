import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { resolveToken } from "@/lib/booking-tokens";
import { buildIcs } from "@/lib/ics";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const resolved = await resolveToken(token);
  if (!resolved || resolved.expired) {
    return new NextResponse("Link expired or invalid", { status: 410 });
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("bookings")
    .select(`
      id, start_at, end_at, status,
      services(name, description),
      businesses(business_name, slug, phone)
    `)
    .eq("id", resolved.bookingId)
    .maybeSingle();

  const row = data as unknown as {
    id: string;
    start_at: string;
    end_at: string;
    status: string;
    services: { name: string; description: string | null } | null;
    businesses: { business_name: string; slug: string; phone: string | null } | null;
  } | null;
  if (!row || !row.services || !row.businesses || row.status === "cancelled") {
    return new NextResponse("Booking not available", { status: 404 });
  }

  const ics = buildIcs({
    uid: `${row.id}@oyrb.space`,
    start: new Date(row.start_at),
    end: new Date(row.end_at),
    title: `${row.services.name} with ${row.businesses.business_name}`,
    description: row.services.description ?? "",
    location: row.businesses.business_name,
    url: `https://www.oyrb.space/s/${row.businesses.slug}`,
  });

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="booking-${row.id.slice(0, 8)}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
