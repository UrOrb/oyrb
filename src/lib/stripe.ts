import Stripe from "stripe";
import type { Tier, BillingCycle } from "@/lib/plans";

// Lazily constructed on first property access. Constructing eagerly at
// module scope crashes `next build` ("Neither apiKey nor config.
// authenticator provided") in any environment without STRIPE_SECRET_KEY
// (CI, local builds) because Next imports route modules while collecting
// page data. Deferring keeps the fail-loudly-at-request-time behavior
// without making the build depend on secrets.
let _stripe: Stripe | null = null;
export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    _stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-03-25.dahlia",
    });
    const value = _stripe[prop as keyof Stripe];
    return typeof value === "function" ? value.bind(_stripe) : value;
  },
});

export type PriceTier = Tier;

/**
 * Resolve a Stripe price ID for the given (tier, cycle). Throws if the env
 * var isn't set, so a misconfigured deploy fails loudly at request time
 * instead of silently sending wrong amounts to checkout.
 */
export function priceIdFor(tier: Tier, cycle: BillingCycle): string {
  const key = `STRIPE_PRICE_${tier.toUpperCase()}_${cycle.toUpperCase()}`;
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env var ${key} — run stripe_setup.js and set it in Vercel.`);
  }
  return value;
}

export function addonPriceIdFor(cycle: BillingCycle): string {
  const key = `STRIPE_PRICE_ADDON_SITE_${cycle.toUpperCase()}`;
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing env var ${key} — run stripe_setup.js and set it in Vercel.`);
  }
  return value;
}

/**
 * Map a Stripe price ID back to a (tier, cycle) so the webhook can sync the
 * account's tier/cycle whenever a subscription changes. Built on demand from
 * env vars to avoid drift.
 */
export function tierFromPriceId(priceId: string): { tier: Tier; cycle: BillingCycle } | null {
  const map: Record<string, { tier: Tier; cycle: BillingCycle }> = {
    [process.env.STRIPE_PRICE_STARTER_MONTHLY ?? ""]: { tier: "starter", cycle: "monthly" },
    [process.env.STRIPE_PRICE_STARTER_ANNUAL ?? ""]: { tier: "starter", cycle: "annual" },
    [process.env.STRIPE_PRICE_STUDIO_MONTHLY ?? ""]:  { tier: "studio",  cycle: "monthly" },
    [process.env.STRIPE_PRICE_STUDIO_ANNUAL ?? ""]:   { tier: "studio",  cycle: "annual" },
    [process.env.STRIPE_PRICE_SCALE_MONTHLY ?? ""]:   { tier: "scale",   cycle: "monthly" },
    [process.env.STRIPE_PRICE_SCALE_ANNUAL ?? ""]:    { tier: "scale",   cycle: "annual" },
  };
  return map[priceId] ?? null;
}

export function isAddonPriceId(priceId: string): boolean {
  return (
    priceId === process.env.STRIPE_PRICE_ADDON_SITE_MONTHLY ||
    priceId === process.env.STRIPE_PRICE_ADDON_SITE_ANNUAL
  );
}

// Back-compat shim — older code imported `PRICE_IDS[tier]`. Deprecated; use
// `priceIdFor(tier, "monthly")` instead.
export const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? "",
  studio:  process.env.STRIPE_PRICE_STUDIO_MONTHLY  ?? "",
  scale:   process.env.STRIPE_PRICE_SCALE_MONTHLY   ?? "",
} as const;
