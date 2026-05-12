import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { finalizeRemoval } from "@/lib/remove-brand/finalize";

/**
 * Phase 8 PR 5 — Daily cron that finalizes in-grace businesses whose
 * 14-day removal window has elapsed.
 *
 * Schedule: 0 5 * * * (vercel.json). Sits between client-imports-sweep
 * (04:30) and trial-bans (06:00) — clean spacing in a global low-
 * traffic window.
 *
 * Sweep query:
 *
 *   where removal_scheduled_for < now()
 *     and removal_initiated_at is not null
 *   order by removal_scheduled_for asc
 *   limit 100
 *
 * Covered by the partial index `idx_businesses_removal_scheduled`
 * (migration 055) — partial over `removal_initiated_at is not null`
 * means only in-grace rows are in the index, so this scan is tiny
 * regardless of total businesses count. Oldest-first so a hypothetical
 * day-with-many-expirations drains FIFO across runs.
 *
 * Per-row iteration with its own try/catch: one finalization failure
 * does NOT stop the loop. The failed business stays in grace and
 * next-day's cron retries. Vercel logs carry the action trace.
 *
 * Note on auth: the cron secret is mandatory. Without it, anyone
 * could trigger this endpoint and start deleting accounts. Same gate
 * shape every other cron in /api/cron/* uses.
 */

const MAX_PER_RUN = 100;

type CandidateRow = {
  id: string;
  business_name: string;
  slug: string;
  owner_id: string;
  contact_email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_connect_account_id: string | null;
};

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const startedAt = Date.now();
  const now = new Date();

  const { data: rows, error: selectErr } = await admin
    .from("businesses")
    .select(
      "id, business_name, slug, owner_id, contact_email, stripe_customer_id, stripe_subscription_id, stripe_connect_account_id",
    )
    .lt("removal_scheduled_for", now.toISOString())
    .not("removal_initiated_at", "is", null)
    .order("removal_scheduled_for", { ascending: true })
    .limit(MAX_PER_RUN);

  if (selectErr) {
    console.error("[finalize-removals] sweep failed:", selectErr.message);
    return NextResponse.json(
      { ok: false, error: "sweep failed", durationMs: Date.now() - startedAt },
      { status: 500 },
    );
  }

  const candidates = (rows ?? []) as CandidateRow[];

  if (candidates.length === 0) {
    console.log(
      `[finalize-removals] no candidates · ${Date.now() - startedAt}ms`,
    );
    return NextResponse.json({
      ok: true,
      finalized: 0,
      failed: 0,
      backlogged: false,
      durationMs: Date.now() - startedAt,
    });
  }

  let finalized = 0;
  let failed = 0;
  // Per-row loop — sequential, not parallel. Each finalization
  // makes 4-6 external calls (email + Storage + Stripe + auth).
  // Serial keeps the rate-limit profile predictable and makes the
  // logs easy to read in chronological order. 100/day cap means
  // worst-case wall-time is well within Vercel's function timeout.
  for (const row of candidates) {
    try {
      const outcome = await finalizeRemoval(row);
      finalized += 1;
      console.log(
        `[finalize-removals] business=${row.id} OK · last=${outcome.isLastBusiness} · storage=${outcome.storageObjectsRemoved} · authDeleted=${outcome.authUserDeleted}`,
      );
    } catch (err) {
      failed += 1;
      console.error(
        `[finalize-removals] business=${row.id} (${row.slug}) FAILED — left in grace for next-day retry:`,
        err,
      );
    }
  }

  const backlogged = candidates.length === MAX_PER_RUN;
  const durationMs = Date.now() - startedAt;
  console.log(
    `[finalize-removals] done finalized=${finalized} failed=${failed} considered=${candidates.length}${backlogged ? " (capped — backlog continues next run)" : ""} · ${durationMs}ms`,
  );

  return NextResponse.json({
    ok: true,
    finalized,
    failed,
    considered: candidates.length,
    backlogged,
    durationMs,
  });
}
