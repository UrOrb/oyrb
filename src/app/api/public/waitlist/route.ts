import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

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
  let body: WaitlistPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.business_id || !body.name || !body.email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
      client_name: body.name,
      client_email: body.email,
      client_phone: body.phone ?? null,
      preferred_window: body.preferred_window ?? null,
      notes: body.notes ?? null,
      status: "waiting",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: entry.id });
}
