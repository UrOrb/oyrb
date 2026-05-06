// Shared constants + helpers for the Dispute Inquiry system (Phase 2.1).
// Single source of truth across:
//   - Migration 040 (DB CHECK constraints, mirrored here)
//   - Filing routes (validation)
//   - Cron sweeper (status transitions)
//   - Admin queue (sort/filter)
//   - Email templates (labels)
//
// When changing reason codes / status values, update both the migration
// CHECK constraint AND this file in lockstep.

export const REASON_CODES = [
  "no_show_pro",
  "no_show_client",
  "service_not_provided",
  "late_arrival_pro",
  "late_arrival_client",
  "quality_issue",
  "communication_issue",
  "fake_business",
  "other",
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];

/**
 * Strike weight per reason code (per Phase 2.1 spec).
 *   - no_show_pro / service_not_provided / fake_business → 3 (severe)
 *   - late_arrival_pro / quality_issue / communication_issue → 2 (moderate)
 *   - no_show_client / late_arrival_client / other → 1 (low — and pro-side
 *     filings are weight 1 because they don't accumulate strikes against
 *     pros; the column tracks the dispute's gravity uniformly)
 *
 * Strike consequences (auto-pause storefront on N strikes) are NOT
 * implemented in this PR — that's PR 2.2. This column records the
 * weight so the consequence layer has the data when it ships.
 */
export const REASON_WEIGHTS: Record<ReasonCode, 1 | 2 | 3> = {
  no_show_pro: 3,
  service_not_provided: 3,
  fake_business: 3,
  late_arrival_pro: 2,
  quality_issue: 2,
  communication_issue: 2,
  no_show_client: 1,
  late_arrival_client: 1,
  other: 1,
};

export const REASON_LABELS: Record<ReasonCode, string> = {
  no_show_pro: "Pro didn't show up",
  no_show_client: "Client didn't show up",
  service_not_provided: "Service was not provided as agreed",
  late_arrival_pro: "Pro arrived late",
  late_arrival_client: "Client arrived late",
  quality_issue: "Quality concern",
  communication_issue: "Communication issue",
  fake_business: "Suspected fake business",
  other: "Other",
};

/**
 * Subset of reason codes available to clients filing against pros.
 * Pro-against-themselves codes (no_show_pro etc) are nonsensical from
 * the pro side; client-against-themselves codes likewise. We constrain
 * server-side and the UI surfaces only the valid subset.
 */
export const CLIENT_REASON_CODES: readonly ReasonCode[] = [
  "no_show_pro",
  "service_not_provided",
  "late_arrival_pro",
  "quality_issue",
  "communication_issue",
  "fake_business",
  "other",
];

export const PRO_REASON_CODES: readonly ReasonCode[] = [
  "no_show_client",
  "late_arrival_client",
  "communication_issue",
  "other",
];

// Filing rules
export const MIN_OTHER_DETAIL_CHARS = 20;
export const MAX_FILES_PER_SIDE = 5;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export function isAllowedMime(mime: string): mime is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime);
}

// Lifecycle
export type DisputeStatus =
  | "awaiting_counter"
  | "under_review"
  | "resolved_strike"
  | "resolved_dismissed"
  | "expired";

export const STATUS_LABELS: Record<DisputeStatus, string> = {
  awaiting_counter: "Awaiting response",
  under_review: "Under review",
  resolved_strike: "Resolved — strike applied",
  resolved_dismissed: "Resolved — dismissed",
  expired: "Expired (admin abandoned)",
};

export const COUNTER_DEADLINE_HOURS = 48;
export const COUNTER_DEADLINE_MS = COUNTER_DEADLINE_HOURS * 60 * 60 * 1000;
export const ANTI_REVENGE_WINDOW_DAYS = 14;
export const ANTI_REVENGE_WINDOW_MS = ANTI_REVENGE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

/**
 * Booking statuses eligible for filing a dispute. Per spec: confirmed,
 * completed, AND cancelled (a cancelled booking might have been
 * improperly cancelled — pro no-showed, etc).
 */
export const FILEABLE_BOOKING_STATUSES: readonly string[] = [
  "confirmed",
  "completed",
  "cancelled",
];

export function reasonRequiresDetail(code: ReasonCode): boolean {
  // 'other' is open-ended and demands the reporter actually wrote something
  // (≥ MIN_OTHER_DETAIL_CHARS). Other codes have implicit context so detail
  // is optional.
  return code === "other";
}
