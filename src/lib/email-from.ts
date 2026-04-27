/**
 * Per-purpose FROM addresses for OYRB transactional + marketing email.
 *
 * The whole oyrb.space domain is verified end-to-end with Resend, so
 * any alias defined here will deliver. Splitting by purpose lets the
 * recipient see at a glance what an email is about, lets us route
 * inbound replies into the correct Zoho folder, and gives us per-stream
 * deliverability levers later (account@ stays promo-free, hello@ carries
 * marketing, etc.).
 *
 * To change a sender for a given email type, edit ADDRESSES below — do
 * not pass `from:` directly at the call site.
 */

export enum EmailPurpose {
  /** Bookings, reminders, waitlist, inquiries, announcements, marketing — anything customer-facing that isn't money/auth/feedback. */
  BOOKING = "BOOKING",
  /** Anything money-related: receipts, gift card purchases, pay-in-full, refunds, chargebacks. */
  PAYMENT = "PAYMENT",
  /** Auth & lifecycle: magic-link sign-in, trial reminders, deactivations. */
  ACCOUNT = "ACCOUNT",
  /** Review / feedback solicitation. */
  FEEDBACK = "FEEDBACK",
  /** Catch-all when no other bucket fits. Currently aliased to hello@. */
  GENERAL = "GENERAL",
}

const ADDRESSES: Record<EmailPurpose, string> = {
  [EmailPurpose.BOOKING]:  "OYRB <hello@oyrb.space>",
  [EmailPurpose.PAYMENT]:  "OYRB <billing@oyrb.space>",
  [EmailPurpose.ACCOUNT]:  "OYRB <account@oyrb.space>",
  [EmailPurpose.FEEDBACK]: "OYRB <feedback@oyrb.space>",
  [EmailPurpose.GENERAL]:  "OYRB <hello@oyrb.space>",
};

export function getFromAddress(purpose: EmailPurpose): string {
  return ADDRESSES[purpose];
}

/**
 * Reply-to for customer-facing transactional email — replies land in the
 * monitored Zoho support inbox. Internal pro alerts (cancellation notice,
 * refund alert, etc.) and the inquiry-forward flow (which uses the
 * sender's own address) intentionally skip this.
 */
export const DEFAULT_REPLY_TO = "support@oyrb.space";
