// ── OYRB plans ────────────────────────────────────────────────────────────────
// Single source of truth for tier definitions, pricing, site quotas, and the
// Stripe price-id env-var names. Used by the pricing page, the dashboard
// gating logic, the checkout endpoint, and the webhook → DB sync. Update here
// once and every surface stays consistent.

export type Tier = "starter" | "studio" | "scale";
export type BillingCycle = "monthly" | "annual";

export type ComparisonRow = {
  name: string;
  price: string;
};

export type TierComparison = {
  rows: ComparisonRow[];
  total?: string;
  takeaway: string;
};

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
  /** "Compare to:" anchor block shown under each tier on the pricing page. */
  comparison: TierComparison;
  /** Subhead under the tier name on the pricing page. */
  recommendedFor?: string;
  highlight?: boolean;
};

export const TIERS: Record<Tier, TierSpec> = {
  starter: {
    id: "starter",
    name: "Starter",
    description: "For solo professionals just getting started.",
    monthlyPriceCents: 2900,
    annualPriceCents: 29000,
    sitesIncluded: 1,
    siteCap: 1,
    features: [
      "1 staff calendar",
      "1 template",
      "Stripe payments",
      "Email confirmations",
      "Email booking reminders",
    ],
    comparison: {
      rows: [
        { name: "GlossGenius Standard", price: "$24/mo + 2.6% transaction fees" },
        { name: "Booksy Base",          price: "$30/mo + transaction fees" },
        { name: "Vagaro Base",          price: "$30/mo + 2.75% transaction fees" },
      ],
      takeaway: "OYRB: One flat fee. Zero transaction fees.",
    },
  },
  studio: {
    id: "studio",
    name: "Studio",
    description: "For growing studios that need more capacity.",
    monthlyPriceCents: 6900,
    annualPriceCents: 69000,
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
    recommendedFor: "Recommended for most beauty pros",
    comparison: {
      rows: [
        { name: "Vagaro Paid Tier",        price: "$50/mo + add-ons" },
        { name: "Squarespace Website",     price: "$23/mo" },
        { name: "Mailchimp Basic",         price: "$20/mo" },
      ],
      total: "Total elsewhere: ~$90–$110/mo",
      takeaway: "OYRB: Everything included for $69/mo. Zero transaction fees.",
    },
  },
  scale: {
    id: "scale",
    name: "Scale",
    description: "For multi-stylist shops and suite operators.",
    monthlyPriceCents: 12900,
    annualPriceCents: 129000,
    sitesIncluded: 3,
    siteCap: 5,
    features: [
      "Unlimited staff",
      "Custom domain",
      "Direct founder support",
      "Unlimited SMS reminders",
      "Priority support",
      "Everything in Studio",
    ],
    comparison: {
      rows: [
        { name: "Vagaro 10-Staff",           price: "$120/mo" },
        { name: "Custom domain service",     price: "$15/mo" },
        { name: "Email marketing platform",  price: "$30/mo" },
        { name: "Additional integrations",   price: "$20–40/mo" },
      ],
      total: "Total elsewhere: ~$150–$200/mo",
      takeaway: "OYRB: All included for $129/mo. Zero transaction fees.",
    },
  },
};

export const ADDON_MONTHLY_CENTS = 2500;
export const ADDON_ANNUAL_CENTS = 25000;
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

/** "$29/mo" or "$290/yr" depending on cycle. */
export function fmtPriceLabel(cents: number, cycle: BillingCycle): string {
  return `${fmtMoney(cents)}/${cycle === "monthly" ? "mo" : "yr"}`;
}

/** "Save ~17%" — annual plans get 2 months free. */
export const ANNUAL_SAVINGS_LABEL = "2 months free";

/**
 * Honest per-month equivalent of an annual price ($290 → "$24.17",
 * $690 → "$57.50", $1290 → "$107.50"). Always two decimal places so
 * the cards line up cleanly under the toggle. Display only — Stripe
 * still bills the full annual amount up front.
 */
export function fmtAnnualAsMonthly(annualCents: number): string {
  const monthly = annualCents / 12 / 100;
  return `$${monthly.toFixed(2)}`;
}

/** "$290 billed annually" — secondary text under the per-month headline. */
export function fmtAnnualBilled(annualCents: number): string {
  return `${fmtMoney(annualCents)} billed annually`;
}
