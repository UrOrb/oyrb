import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";

const COOLDOWN_DAYS = 90;
const COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

/**
 * POST /api/stripe/identity/start
 *
 * Creates a Stripe Identity VerificationSession for the current
 * business and returns the hosted verification URL the client should
 * redirect to. Mirrors the Connect onboard pattern (auth → owner check
 * → admin client → Stripe call → persist → return { url }).
 *
 * Cost protection: each Stripe Identity attempt is ~$1.50. We enforce
 * a 90-day cooldown server-side: pros in 'failed' or 'requires_input'
 * who attempted within the last 90 days get a 429 with a clear retry
 * date. Pros in 'verified' or 'pending' are blocked with 409.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const business = await getCurrentBusiness();
    if (!business) {
      return NextResponse.json({ error: "No active business" }, { status: 400 });
    }
    if (business.owner_id !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const admin = createAdminClient();

    // Re-read fresh state from the row — getCurrentBusiness returns a
    // cached/snapshotted version that may not include the latest webhook-
    // applied identity columns.
    const { data: bizFull } = await admin
      .from("businesses")
      .select(
        "id, identity_verification_status, identity_last_attempted_at",
      )
      .eq("id", business.id)
      .maybeSingle();
    if (!bizFull) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const status = (bizFull as { identity_verification_status?: string })
      .identity_verification_status ?? "none";
    const lastAttempt = (bizFull as { identity_last_attempted_at?: string | null })
      .identity_last_attempted_at;

    if (status === "verified") {
      return NextResponse.json(
        { error: "Already verified." },
        { status: 409 },
      );
    }
    if (status === "pending") {
      return NextResponse.json(
        { error: "Verification already in progress. Refresh in a minute." },
        { status: 409 },
      );
    }

    // 90-day cooldown applies only to 'failed' and 'requires_input' —
    // 'none' has never attempted, so they get to try.
    if (
      (status === "failed" || status === "requires_input") &&
      lastAttempt
    ) {
      const last = new Date(lastAttempt).getTime();
      const now = Date.now();
      if (!isNaN(last) && now - last < COOLDOWN_MS) {
        const retryAt = new Date(last + COOLDOWN_MS).toISOString();
        return NextResponse.json(
          {
            error: `You can retry verification after ${new Date(retryAt).toLocaleDateString()}.`,
            retryAt,
          },
          { status: 429 },
        );
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const session = await stripe.identity.verificationSessions.create({
      type: "document",
      metadata: {
        oyrb_business_id: business.id,
        oyrb_user_id: user.id,
      },
      return_url: `${appUrl}/dashboard/settings?identity=processing`,
    });

    // Persist the session id + bump the cooldown anchor + flip to
    // pending. The webhook will advance status to verified / failed /
    // requires_input when Stripe finishes processing.
    const nowIso = new Date().toISOString();
    const { error: upErr } = await admin
      .from("businesses")
      .update({
        identity_verification_session_id: session.id,
        identity_verification_status: "pending",
        identity_last_attempted_at: nowIso,
      })
      .eq("id", business.id);
    if (upErr) {
      console.error("Failed to persist identity session id", upErr);
      // Must fail here: every identity webhook branch matches rows BY
      // identity_verification_session_id. If it never persisted, the
      // webhook updates zero rows and the verification result is silently
      // lost — the pro pays Stripe's fee and the badge never appears.
      return NextResponse.json(
        { error: "Couldn't start verification — please try again." },
        { status: 500 },
      );
    }

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe didn't return a verification URL." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Identity start error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start verification" },
      { status: 500 },
    );
  }
}
