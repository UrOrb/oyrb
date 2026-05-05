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
