// Canonical set of `purpose` values written to notification_log. Single
// source of truth — new email/SMS templates pick a value from KNOWN_PURPOSES
// (or extend it). Stored as free text in the DB so a new template can ship
// without a migration; the const + the asKnownPurpose() helper give us
// type-safety on the write side.

export const KNOWN_PURPOSES = [
  // Booking lifecycle (client-facing)
  "booking_confirmation",
  "booking_reminder_24h",
  "booking_reminder_2h",
  "booking_cancelled",
  "booking_rescheduled",
  "rebook_reminder",
  "payment_received",
  "review_request",
  "waitlist_alert",

  // Booking lifecycle (pro-facing)
  "owner_booking_alert",
  "owner_cancellation_alert",
  "owner_reschedule_alert",

  // Referrals (Pass the Torch)
  "referral_request",
  "referral_accepted",
  "referral_invite",

  // Subscription billing (pro-facing)
  "pre_billing_reminder",
  "payment_failed",
  "grace_expiring",

  // Trials (pro-facing)
  "trial_reminder_7d",
  "trial_reminder_3d",
  "trial_reminder_1d",
] as const;

export type KnownPurpose = (typeof KNOWN_PURPOSES)[number];

// Human-readable labels for the booking detail page's notification
// timeline (and any future surface that renders notification_log rows).
// Single source of truth — when a new template ships, add its purpose
// to KNOWN_PURPOSES above AND its label here.
//
// Unknown values (e.g. an experimental template that bypassed the
// canonical list) fall through to a snake_case → Title Case humanizer
// so the UI never renders an empty cell.
const PURPOSE_LABELS: Record<string, string> = {
  // Booking lifecycle (client-facing)
  booking_confirmation: "Booking confirmation",
  booking_reminder_24h: "24h reminder",
  booking_reminder_2h: "2h reminder",
  booking_cancelled: "Cancellation notice",
  booking_rescheduled: "Reschedule notice",
  rebook_reminder: "Rebook reminder",
  payment_received: "Payment receipt",
  review_request: "Review request",
  waitlist_alert: "Waitlist alert",

  // Booking lifecycle (pro-facing)
  owner_booking_alert: "New booking alert",
  owner_cancellation_alert: "Cancellation alert",
  owner_reschedule_alert: "Reschedule alert",

  // Referrals (Pass the Torch)
  referral_request: "Trusted Pros request",
  referral_accepted: "Trusted Pros accepted",
  referral_invite: "Trusted Pros invite",

  // Subscription billing (pro-facing)
  pre_billing_reminder: "Renewal reminder",
  payment_failed: "Payment failed",
  grace_expiring: "Grace expiring",

  // Trials (pro-facing)
  trial_reminder_7d: "Trial reminder (7d)",
  trial_reminder_3d: "Trial reminder (3d)",
  trial_reminder_1d: "Trial reminder (1d)",
};

export function displayLabel(purpose: string): string {
  if (PURPOSE_LABELS[purpose]) return PURPOSE_LABELS[purpose];
  // Fallback humanizer: snake_case → Title Case. Keeps the UI graceful
  // for purposes that haven't been added to the canonical map yet.
  return purpose
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export type NotificationStatus =
  | "sent"
  | "delivered"
  | "failed"
  | "undelivered"
  | "bounced";

// ── Status lifecycle ranking ────────────────────────────────────────────
// Webhooks deliver duplicate or out-of-order callbacks (Twilio in particular
// re-fires for retries). We only update a row's status if the incoming one
// is at-or-beyond the current rank, otherwise the late "sent" callback
// would overwrite the already-confirmed "delivered" we got first.
//
// 0 = pre-terminal, 1 = terminal. Spec: "sent < delivered/failed/undelivered/bounced".

const STATUS_RANK: Record<NotificationStatus, number> = {
  sent: 0,
  delivered: 1,
  failed: 1,
  undelivered: 1,
  bounced: 1,
};

export function statusRank(s: NotificationStatus): number {
  return STATUS_RANK[s] ?? 0;
}

// ── Address redaction ──────────────────────────────────────────────────
// recipient_address_redacted is stored partially-masked. Never store full
// PII in this column — Twilio and Resend already retain the original
// recipient on their side; we keep the masked form for pro-facing display.

export function redactPhone(phone: string | null | undefined): string {
  if (!phone) return "***-***-****";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***-***-****";
  const last4 = digits.slice(-4);
  return `***-***-${last4}`;
}

export function redactEmail(email: string | null | undefined): string {
  if (!email) return "***@***";
  const at = email.indexOf("@");
  if (at <= 0) return "***@***";
  const first = email[0];
  return `${first}***${email.slice(at)}`;
}
