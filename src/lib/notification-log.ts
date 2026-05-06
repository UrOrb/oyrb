// Central writer + status-update plumbing for notification_log.
//
// Callers (sms.ts, email.ts, the few inline resend.emails.send routes)
// invoke logNotification at send time. Webhook handlers (Twilio status,
// Resend Svix) invoke updateNotificationStatusByProviderId.
//
// Failure model: every helper here MUST swallow its own DB errors and
// return a sentinel — a transient supabase blip can never block a real
// SMS or email going out. We log to console for diagnostics.

import { createAdminClient } from "@/lib/supabase/server";
import {
  redactEmail,
  redactPhone,
  statusRank,
  type NotificationStatus,
} from "@/lib/notification-purposes";

export type LogChannel = "sms" | "email";
export type LogRecipientType = "client" | "pro";

export type LogParams = {
  businessId?: string | null;
  bookingId?: string | null;
  recipientType: LogRecipientType;
  channel: LogChannel;
  purpose: string;
  providerMessageId?: string | null;
  /** Full recipient address — gets redacted before storage. Pass the raw
   *  email or phone; never pre-mask here. */
  recipientAddress?: string | null;
  status?: NotificationStatus;
  statusDetail?: string | null;
};

/**
 * Insert a notification_log row at send time. Returns the new row id, or
 * null on insert failure. NEVER throws — caller must not let the log
 * call block their actual send.
 */
export async function logNotification(params: LogParams): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    const redacted = params.recipientAddress
      ? params.channel === "sms"
        ? redactPhone(params.recipientAddress)
        : redactEmail(params.recipientAddress)
      : null;

    const { data, error } = await supabase
      .from("notification_log")
      .insert({
        business_id: params.businessId ?? null,
        booking_id: params.bookingId ?? null,
        recipient_type: params.recipientType,
        channel: params.channel,
        purpose: params.purpose,
        provider_message_id: params.providerMessageId ?? null,
        recipient_address_redacted: redacted,
        status: params.status ?? "sent",
        status_detail: params.statusDetail ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("notification_log insert failed:", error.message);
      return null;
    }
    return (data?.id as string) ?? null;
  } catch (err) {
    console.error("notification_log insert threw:", err);
    return null;
  }
}

/**
 * Loads every notification_log row for a booking, ordered oldest-first
 * so the booking detail page can render them as a chronological
 * timeline. Read uses the admin client because the booking detail page
 * already does its own owner check before invoking; the helper itself
 * is non-discriminating.
 */
export type BookingNotification = {
  id: string;
  channel: "sms" | "email";
  recipient_type: "client" | "pro";
  purpose: string;
  status: "sent" | "delivered" | "failed" | "undelivered" | "bounced";
  status_detail: string | null;
  recipient_address_redacted: string | null;
  sent_at: string;
  status_updated_at: string | null;
};

export async function loadNotificationsForBooking(
  bookingId: string,
): Promise<BookingNotification[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("notification_log")
      .select(
        "id, channel, recipient_type, purpose, status, status_detail, recipient_address_redacted, sent_at, status_updated_at",
      )
      .eq("booking_id", bookingId)
      .order("sent_at", { ascending: true });
    if (error) {
      console.error("loadNotificationsForBooking failed:", error.message);
      return [];
    }
    return (data ?? []) as BookingNotification[];
  } catch (err) {
    console.error("loadNotificationsForBooking threw:", err);
    return [];
  }
}

/**
 * Webhook entry point. Looks up the row by provider_message_id and
 * advances its status only when the incoming status is at-or-beyond the
 * current rank. Idempotent — duplicate or out-of-order callbacks are
 * no-ops.
 *
 * Returns "updated" / "skipped" / "not_found" / "error" so webhook
 * routes can log telemetry without their own DB calls.
 */
export async function updateNotificationStatusByProviderId(params: {
  providerMessageId: string;
  status: NotificationStatus;
  statusDetail?: string | null;
}): Promise<"updated" | "skipped" | "not_found" | "error"> {
  try {
    const supabase = createAdminClient();
    const { data: row, error: readErr } = await supabase
      .from("notification_log")
      .select("id, status")
      .eq("provider_message_id", params.providerMessageId)
      .maybeSingle();

    if (readErr) {
      console.error("notification_log read failed:", readErr.message);
      return "error";
    }
    if (!row) return "not_found";

    const currentRank = statusRank(row.status as NotificationStatus);
    const incomingRank = statusRank(params.status);
    if (incomingRank < currentRank) return "skipped";

    const { error: updateErr } = await supabase
      .from("notification_log")
      .update({
        status: params.status,
        status_detail: params.statusDetail ?? null,
        status_updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (updateErr) {
      console.error("notification_log update failed:", updateErr.message);
      return "error";
    }
    return "updated";
  } catch (err) {
    console.error("notification_log update threw:", err);
    return "error";
  }
}
