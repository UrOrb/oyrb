// "How did you hear about us?" survey field — Phase 5 closer.
//
// Single source of truth for the 7 dropdown options:
//   - Code: lowercase enum stored in bookings.survey_response (matches
//     PR #35's utm_source storage convention)
//   - Label: user-facing string rendered in the booking widget AND on
//     the analytics cards
//
// Order is the dropdown rendering order. First entries are more common
// in beauty-pro distribution (Instagram, TikTok) per spec.

export const SURVEY_OPTIONS = [
  { code: "instagram",         label: "Instagram" },
  { code: "tiktok",            label: "TikTok" },
  { code: "word_of_mouth",     label: "Word of mouth / friend referral" },
  { code: "google_search",     label: "Google search" },
  { code: "walked_by",         label: "Walked by" },
  { code: "other",             label: "Other" },
  { code: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

export type SurveyCode = (typeof SURVEY_OPTIONS)[number]["code"];

const CODES = new Set(SURVEY_OPTIONS.map((o) => o.code));

/**
 * Allowlist validator. Returns the input when it's a recognized code,
 * NULL otherwise. Use at every write site (booking insert routes,
 * Stripe-metadata round-trip read in confirm/route.ts) — defense in
 * depth, even though the booking widget's dropdown is the only
 * intended input mechanism.
 *
 * Also runs trim + length cap to absorb any edge-case input (a stray
 * newline, etc. — though all our valid codes are short and clean).
 */
export function sanitizeSurveyResponse(
  raw: string | null | undefined,
): SurveyCode | null {
  if (raw == null) return null;
  if (raw.length === 0) return null;
  if (raw.length > 100) return null; // hard cap before processing
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(raw)) return null; // control chars → reject
  const trimmed = raw.trim().toLowerCase();
  if (!CODES.has(trimmed as SurveyCode)) return null;
  return trimmed as SurveyCode;
}

/**
 * Display-friendly label for a survey code. "instagram" → "Instagram".
 * Used by the analytics layer when bucketing survey-attributed bookings
 * into TopSourcesCard rows.
 */
const CODE_TO_LABEL = Object.fromEntries(
  SURVEY_OPTIONS.map((o) => [o.code, o.label]),
) as Record<SurveyCode, string>;

export function surveyLabel(code: SurveyCode): string {
  return CODE_TO_LABEL[code];
}

/**
 * Source-attribution display label for survey-attributed bookings.
 * Returns "Instagram (self-reported)" / "TikTok (self-reported)" /
 * etc. Used by attributeSource() in business-brain.ts as the priority-1
 * branch of the 6-tier canonical chain.
 *
 * 'prefer_not_to_say' returns NULL — that response intentionally
 * declines to share signal, so analytics fall through to the next
 * priority tier rather than bucketing under "Prefer not to say."
 * 'word_of_mouth' uses the shorter label "Word of mouth" (the
 * "/ friend referral" suffix bloats the source-card row).
 */
const ATTRIBUTION_LABEL: Record<SurveyCode, string | null> = {
  instagram:         "Instagram (self-reported)",
  tiktok:            "TikTok (self-reported)",
  word_of_mouth:     "Word of mouth (self-reported)",
  google_search:     "Google (self-reported)",
  walked_by:         "Walked by (self-reported)",
  other:             "Other (self-reported)",
  prefer_not_to_say: null, // silent — falls through in priority chain
};

export function surveyAttributionLabel(code: SurveyCode): string | null {
  return ATTRIBUTION_LABEL[code];
}
