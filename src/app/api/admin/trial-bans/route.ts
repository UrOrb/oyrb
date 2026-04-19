import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";

/** GET — list every ban with reasons + timestamps. */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("trial_ban_list")
    .select("id, email, phone, reason, trigger_reason, triggering_attempt_ids, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bans: data ?? [] });
}

/** POST — manually ban an email and/or phone. */
export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });

  let body: { email?: string; phone?: string; reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() || null;
  const phone = body.phone?.trim() || null;
  const reason = (body.reason ?? "").trim();
  if (!email && !phone) {
    return NextResponse.json({ error: "Provide an email or phone (or both)." }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "Reason is required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("trial_ban_list")
    .insert({
      email,
      phone,
      reason: `manual:${reason}`,
      trigger_reason: "manual",
      banned_by_user_id: gate.user.id,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
