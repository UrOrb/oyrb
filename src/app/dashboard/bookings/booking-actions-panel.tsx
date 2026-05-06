import { Calendar } from "lucide-react";
import { CancelBookingButton } from "./cancel-button";
import { googleCalendarUrl } from "@/lib/ics";

type Props = {
  bookingId: string;
  status: string;
  startAt: Date;
  endAt: Date;
  serviceName: string;
  serviceDescription: string | null;
  businessName: string;
  businessSlug: string;
  /** When true, the cancel control renders. Suppressed for cancelled
   *  bookings (already cancelled — nothing to cancel) and for bookings
   *  whose start time is in the past. */
  showCancel: boolean;
};

/**
 * Actions panel — the only mutable surface on the detail page in v1.
 *
 * Existing pro-side actions today:
 *   - Cancel (existing CancelBookingButton via /api/bookings/[id]/cancel)
 *
 * Passive affordances (not state-mutating, no new code paths):
 *   - Add to Calendar — Google Calendar URL via the existing helper
 *   - Refund deep-link lives on the service/payment card so the pro
 *     finds it next to the payment data
 *
 * Future actions plug in here as additional rows in the same flex
 * container. Coming up: pro-side reschedule (PR #22).
 */
export function BookingActionsPanel({
  bookingId,
  status,
  startAt,
  endAt,
  serviceName,
  serviceDescription,
  businessName,
  businessSlug,
  showCancel,
}: Props) {
  const gcalUrl = googleCalendarUrl({
    uid: bookingId,
    start: startAt,
    end: endAt,
    title: `${serviceName} with ${businessName}`,
    description: serviceDescription ?? "",
    location: businessName,
    url: `https://www.oyrb.space/s/${businessSlug}`,
  });

  // No actionable affordances when cancelled and there's nothing more
  // to do. We still render the Add-to-Calendar link in case the pro
  // wants the historical event in their calendar — useful for past
  // appointments too.
  return (
    <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
      <h2 className="text-base font-semibold">Actions</h2>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={gcalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E5E4] px-3 py-1.5 text-xs font-medium text-[#525252] hover:border-[#B8896B] hover:text-[#0A0A0A]"
        >
          <Calendar size={12} /> Add to calendar
        </a>
        {showCancel && status === "confirmed" && (
          <CancelBookingButton bookingId={bookingId} />
        )}
      </div>
    </section>
  );
}
