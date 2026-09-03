import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { rateLimit, ipFromRequest } from "@/lib/rate-limit";

type WaitlistPayload = {
  business_id: string;
  service_id?: string | null;
  name: string;
  email: string;
  phone?: string;
  preferred_window?: string;
  notes?: string;
  sms_consent?: boolean;
};

export async function POST(request: NextRequest) {
  const ip = ipFromRequest(request);
  const ipCheck = await rateLimit(`waitlist:ip:${ip}`, 6, 60_000);
  const hourCheck = await rateLimit(`waitlist:h:${ip}`, 30, 60 * 60_000);
  if (!ipCheck.ok || !hourCheck.ok) {
    return NextResponse.json({ error: "Too many waitlist requests — please wait a minute." }, { status: 429 });
  }

  let body: WaitlistPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.business_id || !body.name || !body.email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  body.email = body.email.trim().toLowerCase().slice(0, 150);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const emailCheck = await rateLimit(`waitlist:email:${body.email}`, 5, 60 * 60_000);
  if (!emailCheck.ok) {
    return NextResponse.json({ error: "Too many waitlist requests from this email — please try later." }, { status: 429 });
  }

  const supabase = createAdminClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, is_published, subscription_tier")
    .eq("id", body.business_id)
    .maybeSingle();

  if (!business || !business.is_published) {
    return NextResponse.json({ error: "Business not accepting waitlist" }, { status: 404 });
  }

  // Waitlist is a Studio/Scale feature — gated
  if (!["studio", "scale"].includes(business.subscription_tier ?? "starter")) {
    return NextResponse.json(
      { error: "Waitlist is only available on Studio and Scale plans" },
      { status: 403 }
    );
  }

  const { data: entry, error } = await supabase
    .from("waitlist")
    .insert({
      business_id: body.business_id,
      service_id: body.service_id ?? null,
      client_name: body.name.trim().slice(0, 100),
      client_email: body.email,
      client_phone: body.phone?.trim().slice(0, 30) || null,
      preferred_window: body.preferred_window?.trim().slice(0, 160) || null,
      notes: body.notes?.trim().slice(0, 1000) || null,
      status: "waiting",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: entry.id });
}
