import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeToE164 } from "@/lib/sms";

/**
 * PATCH a single client row. The first dashboard-side write that lets a
 * pro directly mutate a client record outside of the import flow.
 *
 * Auth: cookie-auth via createClient(). RLS policy "Business owners
 * manage clients" (migration 001) gates the SELECT + UPDATE — no admin
 * bypass needed.
 *
 * Existence-leak posture (PR #45 canonical): "doesn't exist" and "not
 * yours" both return the same 404 shape. RLS makes this nearly free —
 * a SELECT against another business returns 0 rows, indistinguishable
 * from a non-existent id.
 *
 * Field allowlist: only `name`, `email`, `phone`, `notes` are accepted.
 * Anything else is silently ignored — we don't want a malformed client
 * payload to be a vector for flipping system-managed fields like
 * `imported_via_id`, `marketing_opt_in_*`, `sms_consent_*`, or
 * `visit_count`. Returning 400 on unknown fields would be more
 * defensive but creates churn when the schema gains a new column;
 * silent ignore is friendlier.
 *
 * Phone-change SMS-consent reset (legal compliance):
 * If the incoming `phone` differs from the existing client's phone AND
 * the existing row has sms_consent=true, we clear all sms_consent_*
 * fields on the same UPDATE. TCPA assigns SMS consent to the specific
 * number, not the person — keeping consent live across a number change
 * means we'd be authorized to text a number the client never opted
 * into. Statutory damages run $500–$1,500 per violation.
 *
 * Frontend (edit-form.tsx) shows a confirmation modal before sending
 * the request, but the backend enforces the reset defensively too —
 * a hand-crafted PATCH that bypasses the modal still gets the consent
 * cleared.
 */

type ExistingClient = {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  sms_consent: boolean;
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // RLS does the business-ownership check. A row that doesn't belong
  // to the caller's business comes back as null — same shape as a
  // non-existent id. Both → 404.
  const { data: existing } = await supabase
    .from("clients")
    .select("id, business_id, name, email, phone, notes, sms_consent")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const current = existing as ExistingClient;

  // Build the UPDATE payload from the field allowlist. Anything else
  // in the body is ignored entirely.
  const patch: Record<string, unknown> = {};

  if ("name" in body) {
    const raw = typeof body.name === "string" ? body.name.trim() : "";
    if (raw.length === 0) {
      return NextResponse.json(
        { error: "invalid_name", message: "Name is required." },
        { status: 400 },
      );
    }
    patch.name = raw;
  }

  if ("email" in body) {
    const raw = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (raw.length === 0) {
      patch.email = null;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      return NextResponse.json(
        { error: "invalid_email", message: "Email address is malformed." },
        { status: 400 },
      );
    } else {
      patch.email = raw;
    }
  }

  let phoneChanged = false;
  if ("phone" in body) {
    const raw = typeof body.phone === "string" ? body.phone.trim() : "";
    if (raw.length === 0) {
      patch.phone = null;
    } else {
      const normalized = normalizeToE164(raw);
      if (!normalized) {
        return NextResponse.json(
          { error: "invalid_phone", message: "Phone number could not be normalized." },
          { status: 400 },
        );
      }
      patch.phone = normalized;
    }
    // Compare against current phone (already normalized at insert time
    // for any phone collected via the import flow; the booking flow
    // doesn't normalize on insert today, so we normalize current.phone
    // here too for the comparison). String inequality is sufficient
    // for triggering the consent reset — caller's intent matters more
    // than "did the value technically change".
    const currentNormalized = current.phone ? normalizeToE164(current.phone) : null;
    phoneChanged = (patch.phone ?? null) !== (currentNormalized ?? current.phone ?? null);
  }

  if ("notes" in body) {
    const raw = typeof body.notes === "string" ? body.notes.trim() : "";
    patch.notes = raw.length === 0 ? null : raw;
  }

  // Defensive SMS-consent reset on phone change. The frontend's
  // confirmation modal makes this an explicit user choice, but a
  // direct API caller (curl, future second client) gets the same
  // protection by virtue of this branch.
  if (phoneChanged && current.sms_consent) {
    patch.sms_consent = false;
    patch.sms_consent_at = null;
    patch.sms_consent_ip = null;
    patch.sms_consent_user_agent = null;
    patch.sms_consent_source = null;
  }

  if (Object.keys(patch).length === 0) {
    // No allowlisted fields supplied. Treat as a no-op success rather
    // than a 400 — UI debounce or a stale form re-submit can land here
    // legitimately.
    return NextResponse.json({ client: current });
  }

  const { data: updated, error: updErr } = await supabase
    .from("clients")
    .update(patch)
    .eq("id", id)
    .select(
      "id, business_id, name, email, phone, notes, sms_consent, sms_consent_at, marketing_opt_in, marketing_opt_in_at, visit_count, created_at",
    )
    .maybeSingle();

  if (updErr) {
    console.error("PATCH /clients/[id] failed:", updErr.message);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({
    client: updated,
    sms_consent_cleared: phoneChanged && current.sms_consent,
  });
}
