import { Mail, MessageSquare, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { loadNotificationsForBooking, type BookingNotification } from "@/lib/notification-log";
import { displayLabel, type NotificationStatus } from "@/lib/notification-purposes";

type Props = { bookingId: string };

/**
 * Notification timeline — chronological log of every SMS and email
 * OYRB sent for this booking. Server component: fetches its own data
 * via loadNotificationsForBooking (admin client; the parent page does
 * the owner check before this component renders).
 *
 * Read-only by design. Pros use this to verify "did the reminder go
 * out?" / "did the cancellation email actually deliver?" without
 * leaving the booking detail page. Bookings that predate Phase 1.3
 * have no rows; the empty state explains that gracefully instead of
 * showing an error.
 */
export async function NotificationTimeline({ bookingId }: Props) {
  const rows = await loadNotificationsForBooking(bookingId);

  return (
    <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
      <h2 className="text-base font-semibold">Notifications</h2>
      <p className="mt-0.5 text-xs text-[#737373]">
        Every SMS and email OYRB sent for this booking.
      </p>

      {rows.length === 0 ? (
        <p className="mt-5 text-sm text-[#737373]">
          No notifications recorded for this booking yet.
        </p>
      ) : (
        <ol className="mt-5 space-y-3">
          {rows.map((row) => (
            <TimelineItem key={row.id} row={row} />
          ))}
        </ol>
      )}
    </section>
  );
}

function TimelineItem({ row }: { row: BookingNotification }) {
  const sentLabel = formatTimestamp(row.sent_at);
  const updatedLabel = row.status_updated_at
    ? formatTimestamp(row.status_updated_at)
    : null;

  return (
    <li className="flex items-start gap-3 rounded-md bg-[#FAFAF9] px-4 py-3">
      <ChannelIcon channel={row.channel} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-sm font-semibold text-[#0A0A0A]">
            {displayLabel(row.purpose)}
          </p>
          <StatusPill status={row.status} />
        </div>
        <p className="mt-1 text-xs text-[#737373]">
          {row.recipient_type === "client" ? "to client" : "to you"}
          {row.recipient_address_redacted ? <> · {row.recipient_address_redacted}</> : null}
        </p>
        <p className="mt-1 text-[11px] text-[#A3A3A3]">
          Sent {sentLabel}
          {updatedLabel && row.status !== "sent" && (
            <> · {labelForStatusEvent(row.status)} {updatedLabel}</>
          )}
        </p>
        {row.status_detail && row.status !== "sent" && row.status !== "delivered" && (
          <p className="mt-1 text-[11px] text-red-700">
            {row.status_detail}
          </p>
        )}
      </div>
    </li>
  );
}

function ChannelIcon({ channel }: { channel: BookingNotification["channel"] }) {
  if (channel === "sms") {
    return (
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#525252]"
      >
        <MessageSquare size={14} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[#525252]"
    >
      <Mail size={14} />
    </span>
  );
}

function StatusPill({ status }: { status: NotificationStatus }) {
  const cls =
    status === "delivered"
      ? "bg-emerald-50 text-emerald-700"
      : status === "sent"
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";
  const Icon =
    status === "delivered"
      ? CheckCircle2
      : status === "sent"
        ? Clock
        : AlertTriangle;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls}`}
    >
      <Icon size={10} />
      {status}
    </span>
  );
}

function labelForStatusEvent(status: NotificationStatus): string {
  if (status === "delivered") return "delivered";
  if (status === "bounced") return "bounced";
  if (status === "undelivered") return "undelivered";
  if (status === "failed") return "failed";
  return status;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
