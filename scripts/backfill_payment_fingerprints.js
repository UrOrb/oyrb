#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * One-shot backfill: for every account_subscriptions row missing
 * payment_method_fingerprint, fetch the Stripe subscription, expand
 * default_payment_method, grab the card fingerprint, write it back.
 *
 * Then triggers the auto-ban detector once so any pre-existing
 * cross-account duplicates get flagged immediately.
 *
 * Run once after deploying migration 012:
 *
 *   export STRIPE_SECRET_KEY="sk_live_..."     # or sk_test_ in test mode
 *   export NEXT_PUBLIC_SUPABASE_URL="..."
 *   export SUPABASE_SERVICE_ROLE_KEY="..."
 *   export NEXT_PUBLIC_APP_URL="https://oyrb.space"
 *   export CRON_SECRET="..."
 *   node scripts/backfill_payment_fingerprints.js
 *
 * Idempotent: rows that already have a fingerprint are skipped.
 */

const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const CRON_SECRET = process.env.CRON_SECRET;

for (const [name, value] of Object.entries({
  STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
})) {
  if (!value) {
    console.error(`✗ ${name} is not set`);
    process.exit(1);
  }
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-09-30.acacia" });
const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`\nPayment-method-fingerprint backfill — mode: ${STRIPE_SECRET_KEY.startsWith("sk_live_") ? "LIVE ⚠️" : "test"}\n`);

  const { data: rows, error } = await sb
    .from("account_subscriptions")
    .select("user_id, stripe_subscription_id, payment_method_fingerprint")
    .is("payment_method_fingerprint", null);

  if (error) {
    console.error("✗ Failed to load rows:", error.message);
    process.exit(1);
  }

  console.log(`Found ${rows.length} subscription(s) missing a fingerprint.\n`);

  let updated = 0;
  let skippedNoCard = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id, {
        expand: ["default_payment_method"],
      });
      const pm = sub.default_payment_method;
      const fp = pm && typeof pm !== "string" && pm.card ? pm.card.fingerprint : null;
      if (!fp) {
        console.log(`  · ${row.stripe_subscription_id} — no card fingerprint available, skipped`);
        skippedNoCard++;
        continue;
      }
      const { error: upErr } = await sb
        .from("account_subscriptions")
        .update({ payment_method_fingerprint: fp })
        .eq("user_id", row.user_id);
      if (upErr) throw upErr;
      console.log(`  ✓ ${row.stripe_subscription_id} — ${fp.slice(0, 12)}…`);
      updated++;
    } catch (err) {
      errors++;
      console.error(`  ✗ ${row.stripe_subscription_id}: ${err.message ?? err}`);
    }
  }

  console.log(
    `\nDone. Updated ${updated}, skipped ${skippedNoCard} (no card on file), errors ${errors}.`
  );

  // Kick the detector once so any pre-existing cross-account duplicates get
  // flagged. Best-effort — exit cleanly if env isn't set up for it.
  if (APP_URL && CRON_SECRET) {
    console.log("\nTriggering auto-ban detector once…");
    try {
      const res = await fetch(`${APP_URL}/api/cron/trial-bans`, {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      });
      const j = await res.json();
      console.log("  detector response:", j);
    } catch (err) {
      console.warn("  could not reach detector endpoint:", err?.message ?? err);
    }
  } else {
    console.log("\nSkipped detector kick — set NEXT_PUBLIC_APP_URL + CRON_SECRET to enable.");
  }
}

main().catch((err) => {
  console.error("\n✗ Backfill failed:", err && err.message ? err.message : err);
  process.exit(1);
});
