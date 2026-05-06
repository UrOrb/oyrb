import Link from "next/link";
import { ArrowLeft, Calendar, Clock } from "lucide-react";

type Props = {
  serviceName: string;
  status: string;
  startAt: Date;
  endAt: Date;
  cancelledAt: string | null;
};

/**
 * Top of the booking detail page — back link, status pill, service name
 * as the H1, and the scheduled window. Status badge color matches the
 * bookings list (confirmed=green, cancelled=red, completed=blue,
 * pending/other=amber) so the visual language stays consistent across
 * surfaces.
 */
export function BookingHeader({
  serviceName,
  status,
  startAt,
  endAt,
  cancelledAt,
}: Props) {
  const dateLabel = startAt.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeLabel =
    startAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) +
    " – " +
    endAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div>
      <Link
        href="/dashboard/bookings"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#737373] hover:text-[#0A0A0A]"
      >
        <ArrowLeft size={12} />
        Back to bookings
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium tracking-tight md:text-3xl">
            {serviceName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#525252]">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={14} /> {dateLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={14} /> {timeLabel}
            </span>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {status === "cancelled" && cancelledAt && (
        <p className="mt-2 text-xs text-[#737373]">
          Cancelled{" "}
          {new Date(cancelledAt).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
          .
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  // Color treatment matches src/app/dashboard/bookings/page.tsx so the
  // list and detail surfaces speak the same visual language.
  const cls =
    status === "confirmed"
      ? "bg-green-50 text-green-700"
      : status === "cancelled"
        ? "bg-red-50 text-red-700"
        : status === "completed"
          ? "bg-blue-50 text-blue-700"
          : "bg-amber-50 text-amber-700";
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${cls}`}
    >
      {status}
    </span>
  );
}
