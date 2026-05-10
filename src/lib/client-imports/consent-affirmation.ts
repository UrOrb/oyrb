// Single source of truth for the import-time consent affirmation:
// the version constant, the canonical copy, and the two checkbox
// labels. All three of:
//
//   1. The commit route (writes consent_affirmation_version into the
//      audit row)
//   2. The preview-client modal (renders the copy + checkboxes)
//   3. The docs/client-imports-consent.md reference page
//
// reach into this module so the affirmation language can never drift
// between what the pro saw, what the audit row records, and what the
// public docs page says.
//
// Why versioned, not free-form: when the legal team revises the copy
// (lawyer review pending — see docs/client-imports-consent.md), bump
// CONSENT_AFFIRMATION_VERSION and write the new copy below. Past
// imports retain their version-stamped audit record, so we can later
// answer "what exactly did this pro click through to?" by joining
// version → archived copy. The current copy lives here; archived
// copies live in git history.
//
// Lawyer review pending. This is best-effort plain English.

/**
 * Version of the affirmation copy currently in force. Written into
 * client_imports.consent_affirmation_version on every commit. Bump
 * when the copy below changes.
 *
 * Version history:
 *   1 — Initial Phase 7 PR 5/5. Plain English; not yet lawyer-reviewed.
 */
export const CONSENT_AFFIRMATION_VERSION = 1;

/**
 * Three statements the pro affirms about how the contact list was
 * collected. Pre-tense — what already happened.
 */
export const CONSENT_AFFIRMATIONS: readonly string[] = [
  "You collected this contact information directly from these clients in connection with your beauty business.",
  "You have a legitimate business relationship with each of these clients.",
  "These clients have not asked to receive promotional messages from OYRB.",
];

/**
 * Forward-looking commitments the pro agrees to. Future-tense — what
 * the pro promises to do (and not do) with the imported list.
 *
 * The opt-in mechanisms are named concretely so the pro knows the
 * exact paths through which fresh consent can be collected, not a
 * vague "OYRB's opt-in flows."
 */
export const CONSENT_COMMITMENTS: readonly string[] = [
  "Not use this list for unsolicited marketing. To send these clients marketing emails or SMS, you must first collect fresh opt-in consent through OYRB's booking widget, the per-client edit page, or the magic-link booking flow.",
];

/**
 * Closing reassurance about what OYRB does (and does not do) with
 * the imported contacts. Sets the platform-side default behavior so
 * the pro understands the affirmation is gating, not granting —
 * imported clients are NOT auto-enrolled in any messaging.
 */
export const CONSENT_PLATFORM_BEHAVIOR =
  "OYRB will store these contacts in your private client database. They will not receive any messages from OYRB until you explicitly enable marketing or SMS consent for each individual client.";

/**
 * The two checkbox labels the pro must explicitly tick before the
 * Confirm button enables. Both required — single-checkbox shortcuts
 * are not allowed (one attests to past collection, the other to
 * future use; conflating them would weaken both signals).
 */
export const CONSENT_CHECKBOXES: readonly { id: string; label: string }[] = [
  {
    id: "collected_legitimately",
    label: "I confirm I collected this information legitimately from these clients.",
  },
  {
    id: "no_marketing_until_opt_in",
    label:
      "I understand these clients will not receive marketing or SMS messages until I obtain fresh consent.",
  },
];
