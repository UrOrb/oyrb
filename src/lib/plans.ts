// ── OYRB plans ────────────────────────────────────────────────────────────────
// Single source of truth for tier definitions, pricing, site quotas, and the
// Stripe price-id env-var names. Used by the pricing page, the dashboard
// gating logic, the checkout endpoint, and the webhook → DB sync. Update here
// once and every surface stays consistent.

export type Tier = "starter" | "studio" | "scale";
export type BillingCycle = "monthly" | "annual";

export type TierSpec = {
  id: Tier;
  name: string;
  description: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  /** Sites included in the base plan, no add-ons. */
  sitesIncluded: number;
  /** Hard ceiling — included + paid add-ons can never exceed this. */
  siteCap: number;
  /** Marketing copy. */
  features: string[];
  highlight?: boolean;
};

export const TIERS: Record<Tier, TierSpec> = {
  starter: {
    id: "starter",
    name: "Starter",
    description: "For solo professionals just getting started.",
    monthlyPriceCents: 2400,
    annualPriceCents: 24000,
    sitesIncluded: 1,
    siteCap: 1,
    features: [
      "1 staff calendar",
      "1 template",
      "Stripe payments",
      "Email confirmations",
      "Email booking reminders",
    ],
  },
  studio: {
    id: "studio",
    name: "Studio",
    description: "For growing studios that need more capacity.",
    monthlyPriceCents: 4900,
    annualPriceCents: 49000,
    sitesIncluded: 2,
    siteCap: 3,
    features: [
      "Up to 3 staff",
      "All templates + themes",
      "Deposits + intake forms",
      "SMS reminders (24h before)",
      "Waitlist + last-min slot alerts",
      "Everything in Starter",
    ],
    highlight: true,
  },
  scale: {
    id: "scale",
    name: "Scale",
    description: "For multi-stylist shops and suite operators.",
    monthlyPriceCents: 8900,
    annualPriceCents: 89000,
    sitesIncluded: 3,
    siteCap: 5,
    features: [
      "Unlimited staff",
      "Custom domain",
      "Multi-location booking",
      "Unlimited SMS reminders",
      "Priority support",
      "Everything in Studio",
    ],
  },
};

export const ADDON_MONTHLY_CENTS = 2000;
export const ADDON_ANNUAL_CENTS = 20000;
export const ADDON_NAME = "Additional site";

/** Price-id env var name for a given (tier, cycle). */
export function priceIdEnv(tier: Tier, cycle: BillingCycle): string {
  return `STRIPE_PRICE_${tier.toUpperCase()}_${cycle.toUpperCase()}`;
}

/** Price-id env var name for the add-on at the given cycle. */
export function addonPriceIdEnv(cycle: BillingCycle): string {
  return `STRIPE_PRICE_ADDON_SITE_${cycle.toUpperCase()}`;
}

/** Site allowance = min(siteCap, sitesIncluded + addonCount). */
export function siteAllowance(tier: Tier, addonCount: number): number {
  const spec = TIERS[tier];
  return Math.min(spec.siteCap, spec.sitesIncluded + Math.max(0, addonCount));
}

/** True if the user can add another site without buying an add-on. */
export function withinIncluded(tier: Tier, currentSites: number): boolean {
  return currentSites < TIERS[tier].sitesIncluded;
}

/** True if the user is allowed to buy an add-on right now. */
export function canBuyAddon(tier: Tier, currentSites: number): boolean {
  return tier !== "starter" && currentSites < TIERS[tier].siteCap;
}

export function fmtMoney(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

/** "$24/mo" or "$240/yr" depending on cycle. */
export function fmtPriceLabel(cents: number, cycle: BillingCycle): string {
  return `${fmtMoney(cents)}/${cycle === "monthly" ? "mo" : "yr"}`;
}

/** "Save ~17%" — annual plans get 2 months free. */
export const ANNUAL_SAVINGS_LABEL = "2 months free";

/**
 * Display the annual price as its per-month equivalent. Whole-dollar
 * rounding is the canonical convention across plans and the add-on
 * (240→$20, 490→$41, 890→$74, 200→$17). Used only for display — actual
 * Stripe charges are still the full annual amount up front.
 */
export function fmtAnnualAsMonthly(annualCents: number): string {
  const monthly = Math.round(annualCents / 12 / 100);
  return `$${monthly}`;
}

/** "$240 billed annually" — secondary text under the per-month headline. */
export function fmtAnnualBilled(annualCents: number): string {
  return `${fmtMoney(annualCents)} billed annually`;
}
