// Client-safe constants + sanitizers for the verified-stats strip.
// Kept out of pro-stats.ts (which pulls createAdminClient, server-only)
// so that client components — the site editor's dropdown + label inputs
// — can import these without dragging server-only Supabase code into
// the browser bundle.

export type StatType =
  | "verified_rating"
  | "verified_reviews"
  | "completed_bookings"
  | "years_on_oyrb"
  | "services_offered"
  | "specialty"
  | "location"
  | "client_retention";

export const STAT_TYPES: StatType[] = [
  "verified_rating",
  "verified_reviews",
  "completed_bookings",
  "years_on_oyrb",
  "services_offered",
  "specialty",
  "location",
  "client_retention",
];

export const DEFAULT_LABELS: Record<StatType, string> = {
  verified_rating:    "Rating",
  verified_reviews:   "Reviews",
  completed_bookings: "Bookings",
  years_on_oyrb:      "On OYRB",
  services_offered:   "Services",
  specialty:          "Specialty",
  location:           "Location",
  client_retention:   "Return Rate",
};

export const STAT_OPTION_LABELS: Record<StatType, string> = {
  verified_rating:    "Verified Rating",
  verified_reviews:   "Verified Reviews",
  completed_bookings: "Completed Bookings",
  years_on_oyrb:      "Years on OYRB",
  services_offered:   "Services Offered",
  specialty:          "Specialty",
  location:           "Location",
  client_retention:   "Client Retention",
};

// Strip digits, %, ★, decimals — anything that could imply false data.
// Caps at 20 chars.
export function sanitizeStatLabel(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/[0-9]/g, "")
    .replace(/[%★✦✧*.#+]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20);
}

export function isLabelSanitized(raw: string): boolean {
  return !/[0-9%★✦✧*.#+]/.test(raw);
}
