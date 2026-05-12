// Single source of truth for the Remove Brand confirmation flow:
// the version constant, the canonical copy blocks, and the two
// affirmation checkbox labels. All consumers reach into this module
// so the wording can never drift between:
//
//   1. The confirm form (renders the copy + checkboxes)
//   2. The server action (writes removal_confirmation_version into
//      businesses + business_removal_events audit rows)
//   3. The initiation email (mirrors the same affirmations back to
//      the pro as a receipt)
//
// Why versioned: when this copy is revised (legal review, plain-
// English pass, new bullet on what disappears), bump
// CONFIRMATION_COPY_VERSION below. Past initiations retain their
// version-stamped audit record, so we can answer "what exactly did
// this pro click through to?" by joining version → archived copy
// (current copy here; archived copies in git history).
//
// Pattern mirrors src/lib/client-imports/consent-affirmation.ts
// from PR #53.

/**
 * Version of the confirmation copy currently in force. Written into
 * `businesses.removal_confirmation_version` and
 * `business_removal_events.copy_version` on every initiation. Bump
 * when any of the copy below changes.
 *
 * Version history:
 *   1 — Initial Phase 8 PR 4. Plain English; not yet lawyer-reviewed.
 */
export const CONFIRMATION_COPY_VERSION = 1;

/**
 * Grace period applied to every initiation in this version of the
 * copy. Captured per-removal into
 * `businesses.removal_grace_period_days` so changing this constant
 * later doesn't retroactively shorten or extend in-flight grace
 * windows.
 */
export const REMOVAL_GRACE_PERIOD_DAYS = 14;

/**
 * Three bulleted lists the confirm page renders inside `bg-[#FAFAF9]`
 * info cards. Each list answers one question the pro is likely
 * asking: "what changes now / what can I still do / what's gone
 * after [date]." Order matches the on-page order.
 */
export const IMMEDIATE_EFFECTS: readonly string[] = [
  "Your storefront 404s at oyrb.space/s/<slug>.",
  "Your /find directory tile disappears.",
  "The booking widget refuses new bookings on or after today.",
  "Your Stripe subscription cancels at the end of your current billing period — no prorated refund; you keep the time you paid for.",
];

export const DURING_GRACE: readonly string[] = [
  "Log into your dashboard like normal.",
  "Fulfill existing booked appointments.",
  "Send and receive booking reminders for those appointments.",
  "Restore your brand at any time, from this page or the dashboard banner.",
];

export const FINAL_DELETION: readonly string[] = [
  "Every client, booking, service, photo, and review you have on OYRB.",
  "Your storefront, custom domain mapping, and any remaining bookings.",
  "Your OYRB login.",
  "All of this is irreversible after the deletion date.",
];

/**
 * Forward-looking affirmations gating the primary CTA. Both must be
 * ticked; combined with the business-name match they form the
 * three-way confirmation (PR #53 friction-is-feature precedent).
 */
export const CONFIRMATION_CHECKBOXES: readonly {
  id: string;
  label: string;
}[] = [
  {
    id: "data_downloaded",
    label:
      "I've downloaded the data I want to keep, or I don't need a copy.",
  },
  {
    id: "understand_permanent",
    label:
      "I understand that on the deletion date, everything above is removed permanently and cannot be recovered.",
  },
];

/**
 * Hint copy under the business-name input. The action accepts a
 * case-insensitive trimmed match for forgiveness, but the on-page
 * hint says "exact match" so pros aren't surprised when "  life as
 * a Lania Renee  " is accepted as equivalent to the canonical name.
 */
export const BUSINESS_NAME_HINT_TEMPLATE = (name: string) =>
  `Must match "${name}" exactly (case and spacing don't matter).`;

/**
 * Pure helper used by both the form and the action. Case-insensitive
 * compare on trimmed inputs. Returns false on empty input.
 */
export function businessNameMatches(
  input: string | null | undefined,
  canonical: string | null | undefined,
): boolean {
  if (!input || !canonical) return false;
  return input.trim().toLowerCase() === canonical.trim().toLowerCase();
}
