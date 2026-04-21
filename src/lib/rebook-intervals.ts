// Category-default rebook intervals. Pros can override per category via
// pro_rebook_intervals. Kept in code (not DB) because these are product
// defaults — editing them is a deploy, not an ops task.

export type ServiceCategory =
  | "hair"
  | "hair_color"
  | "hair_braids"
  | "nails"
  | "lashes"
  | "brows"
  | "skincare"
  | "facial"
  | "makeup"
  | "barber"
  | "massage"
  | "waxing"
  | "other";

export const DEFAULT_REBOOK_DAYS: Record<ServiceCategory, number> = {
  hair: 28,
  hair_color: 42,
  hair_braids: 56,
  nails: 14,
  lashes: 21,
  brows: 21,
  skincare: 28,
  facial: 28,
  makeup: 30,
  barber: 21,
  massage: 30,
  waxing: 28,
  other: 30,
};

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  hair: "Hair (cut / style)",
  hair_color: "Hair color",
  hair_braids: "Hair (braids)",
  nails: "Nails",
  lashes: "Lashes",
  brows: "Brows",
  skincare: "Skincare",
  facial: "Facial",
  makeup: "Makeup",
  barber: "Barber",
  massage: "Massage",
  waxing: "Waxing",
  other: "Other",
};

export function isValidCategory(s: string | null | undefined): s is ServiceCategory {
  return !!s && (Object.keys(DEFAULT_REBOOK_DAYS) as string[]).includes(s);
}

export function defaultIntervalFor(category: string | null | undefined): number {
  return isValidCategory(category) ? DEFAULT_REBOOK_DAYS[category] : 30;
}
