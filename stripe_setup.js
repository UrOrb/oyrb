#!/usr/bin/env node
/* eslint-disable no-console */

/**
 * stripe_setup.js — provision OYRB's Stripe Products and Prices.
 *
 * Idempotent: safe to re-run. Looks up Products by name and Prices by
 * (Product, nickname) before creating; reuses anything that already
 * exists. Defaults to test mode — uses whatever STRIPE_SECRET_KEY is
 * exported in the shell. Run with sk_test_… first, verify the flow,
 * then re-run with sk_live_… to mirror the same setup in live mode.
 *
 *   npm install stripe          # one time
 *   export STRIPE_SECRET_KEY="sk_test_..."
 *   node stripe_setup.js
 */

const Stripe = require("stripe");

const SECRET = process.env.STRIPE_SECRET_KEY;
if (!SECRET) {
  console.error(
    "✗ STRIPE_SECRET_KEY is not set. Export your test key first:\n" +
      '   export STRIPE_SECRET_KEY="sk_test_..."'
  );
  process.exit(1);
}

const isLive = SECRET.startsWith("sk_live_");
const stripe = new Stripe(SECRET, { apiVersion: "2024-09-30.acacia" });

// Products + prices. This list IS the source of truth — mirror it in
// src/lib/plans.ts and STRIPE_SETUP.md if you change anything.
const SPEC = [
  {
    productName: "Starter Plan",
    productDescription: "For solo professionals just getting started.",
    productMetadata: { tier: "starter", site_cap: "1", sites_included: "1" },
    prices: [
      {
        nickname: "starter_monthly",
        amountCents: 2900,
        interval: "month",
        envName: "STRIPE_PRICE_STARTER_MONTHLY",
        metadata: { tier: "starter", sites_included: "1", site_cap: "1" },
      },
      {
        nickname: "starter_annual",
        amountCents: 29000,
        interval: "year",
        envName: "STRIPE_PRICE_STARTER_ANNUAL",
        metadata: { tier: "starter", sites_included: "1", site_cap: "1" },
      },
    ],
  },
  {
    productName: "Studio Plan",
    productDescription: "For growing studios that need more capacity.",
    productMetadata: { tier: "studio", site_cap: "3", sites_included: "2" },
    prices: [
      {
        nickname: "studio_monthly",
        amountCents: 6900,
        interval: "month",
        envName: "STRIPE_PRICE_STUDIO_MONTHLY",
        metadata: { tier: "studio", sites_included: "2", site_cap: "3" },
      },
      {
        nickname: "studio_annual",
        amountCents: 69000,
        interval: "year",
        envName: "STRIPE_PRICE_STUDIO_ANNUAL",
        metadata: { tier: "studio", sites_included: "2", site_cap: "3" },
      },
    ],
  },
  {
    productName: "Scale Plan",
    productDescription: "For multi-stylist shops and suite operators.",
    productMetadata: { tier: "scale", site_cap: "5", sites_included: "3" },
    prices: [
      {
        nickname: "scale_monthly",
        amountCents: 12900,
        interval: "month",
        envName: "STRIPE_PRICE_SCALE_MONTHLY",
        metadata: { tier: "scale", sites_included: "3", site_cap: "5" },
      },
      {
        nickname: "scale_annual",
        amountCents: 129000,
        interval: "year",
        envName: "STRIPE_PRICE_SCALE_ANNUAL",
        metadata: { tier: "scale", sites_included: "3", site_cap: "5" },
      },
    ],
  },
  {
    productName: "Additional Site Add-on",
    productDescription:
      "One additional booking site, billed alongside your plan.",
    productMetadata: { type: "site_addon" },
    prices: [
      {
        nickname: "addon_site_monthly",
        amountCents: 2500,
        interval: "month",
        envName: "STRIPE_PRICE_ADDON_SITE_MONTHLY",
        metadata: { type: "site_addon" },
      },
      {
        nickname: "addon_site_annual",
        amountCents: 25000,
        interval: "year",
        envName: "STRIPE_PRICE_ADDON_SITE_ANNUAL",
        metadata: { type: "site_addon" },
      },
    ],
  },
];

async function findProductByName(name) {
  // Stripe doesn't index Products by name — page through and match.
  let starting_after;
  while (true) {
    const page = await stripe.products.list({ limit: 100, starting_after });
    const hit = page.data.find((p) => p.name === name && p.active);
    if (hit) return hit;
    if (!page.has_more) return null;
    starting_after = page.data[page.data.length - 1].id;
  }
}

async function findPriceByNickname(productId, nickname) {
  let starting_after;
  while (true) {
    const page = await stripe.prices.list({
      product: productId,
      limit: 100,
      starting_after,
    });
    const hit = page.data.find((p) => p.nickname === nickname && p.active);
    if (hit) return hit;
    if (!page.has_more) return null;
    starting_after = page.data[page.data.length - 1].id;
  }
}

async function ensureProduct(spec) {
  const existing = await findProductByName(spec.productName);
  if (existing) {
    console.log(`✓ Product exists: ${spec.productName} (${existing.id})`);
    return existing;
  }
  const created = await stripe.products.create({
    name: spec.productName,
    description: spec.productDescription,
    metadata: spec.productMetadata,
  });
  console.log(`+ Product created: ${spec.productName} (${created.id})`);
  return created;
}

async function ensurePrice(productId, p) {
  const existing = await findPriceByNickname(productId, p.nickname);
  if (existing) {
    console.log(
      `   ✓ Price exists: ${p.nickname} ($${(p.amountCents / 100).toFixed(2)}/${p.interval}) — ${existing.id}`
    );
    return existing;
  }
  const created = await stripe.prices.create({
    product: productId,
    nickname: p.nickname,
    unit_amount: p.amountCents,
    currency: "usd",
    recurring: { interval: p.interval },
    metadata: p.metadata,
  });
  console.log(
    `   + Price created: ${p.nickname} ($${(p.amountCents / 100).toFixed(2)}/${p.interval}) — ${created.id}`
  );
  return created;
}

async function main() {
  console.log(
    `\nStripe setup — ${isLive ? "LIVE MODE ⚠️" : "test mode"}` +
      `\nUsing key starting ${SECRET.slice(0, 10)}…\n`
  );

  const envBlock = [];
  for (const spec of SPEC) {
    const product = await ensureProduct(spec);
    for (const p of spec.prices) {
      const price = await ensurePrice(product.id, p);
      envBlock.push(`${p.envName}=${price.id}`);
    }
  }

  console.log(
    "\n──────────────────────────────────────────────────────────────"
  );
  console.log("Done. Paste the following into your .env.local and Vercel env:\n");
  console.log(envBlock.join("\n"));
  console.log(
    "──────────────────────────────────────────────────────────────\n"
  );
  if (isLive) {
    console.log(
      "⚠️  These are LIVE-mode price IDs. Update Vercel production env vars,\n" +
        "    then redeploy. Do not commit them to git."
    );
  } else {
    console.log(
      "Next: verify the full signup → checkout → add-on flow with test cards,\n" +
        "      then re-run this script with your sk_live_ key to mirror the same\n" +
        "      setup in live mode."
    );
  }
}

main().catch((err) => {
  console.error("\n✗ Setup failed:", err && err.message ? err.message : err);
  process.exit(1);
});
