import Link from "next/link";
import { resolveToken } from "@/lib/booking-tokens";
import { createAdminClient } from "@/lib/supabase/server";
import { ReviewForm } from "./review-form";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Leave a review — OYRB",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ token: string }> };

type BookingRow = {
  id: string;
  end_at: string;
  status: string;
  services: { name: string } | null;
  clients: { name: string; email: string | null } | null;
  businesses: { business_name: string; slug: string } | null;
};

export default async function LeaveReviewPage({ params }: Props) {
  const { token } = await params;
  const resolved = await resolveToken(token);
  if (!resolved || resolved.expired) return <ExpiredView />;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("bookings")
    .select(`
      id, end_at, status,
      services(name),
      clients(name, email),
      businesses(business_name, slug)
    `)
    .eq("id", resolved.bookingId)
    .maybeSingle();

  const booking = data as unknown as BookingRow | null;
  if (!booking || !booking.services || !booking.businesses || !booking.clients) {
    return <NotFoundView />;
  }

  if (booking.status === "cancelled") {
    return <CancelledView />;
  }

  // Check whether the appointment has actually happened. If not, we
  // show a friendly "come back later" — the submit API re-checks.
  if (new Date(booking.end_at).getTime() > Date.now()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4">
        <div className="max-w-sm rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center shadow-sm">
          <h1 className="font-display text-2xl font-medium">
            Come back after your appointment
          </h1>
          <p className="mt-3 text-sm text-[#737373]">
            Reviews open once your service with{" "}
            <strong>{booking.businesses.business_name}</strong> is complete.
          </p>
          <Link
            href={`/booking/${token}`}
            className="mt-6 inline-block text-xs text-[#A3A3A3] underline"
          >
            ← Back to my booking
          </Link>
        </div>
      </div>
    );
  }

  // Duplicate-review block — show a cleaner message than bouncing from the API.
  const { data: existing } = await supabase
    .from("reviews")
    .select("id, status")
    .eq("booking_id", booking.id)
    .maybeSingle();
  if (existing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4">
        <div className="max-w-sm rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Review received
          </p>
          <h1 className="mt-2 font-display text-2xl font-medium">
            You already left a review for this appointment.
          </h1>
          <p className="mt-3 text-sm text-[#737373]">
            Thanks! It publishes on{" "}
            <strong>{booking.businesses.business_name}</strong>&apos;s site after
            a 24-hour hold.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] py-12 px-4">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B8896B]">
            Share your experience
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium">
            How was your {booking.services.name}?
          </h1>
          <p className="mt-2 text-sm text-[#737373]">
            Your feedback helps other clients find{" "}
            <strong>{booking.businesses.business_name}</strong>.
          </p>
        </div>

        <ReviewForm token={token} />

        <p className="mt-6 text-center text-[11px] text-[#A3A3A3]">
          Reviews go live 24 hours after you submit. You&apos;ll appear as your
          first name + last initial. Don&apos;t include your email, phone, or
          address.
        </p>
      </div>
    </div>
  );
}

function NotFoundView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4">
      <div className="max-w-sm rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-medium">Booking not found</h1>
        <p className="mt-3 text-sm text-[#737373]">
          This review link isn&apos;t valid. Check the URL in your email.
        </p>
      </div>
    </div>
  );
}

function CancelledView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4">
      <div className="max-w-sm rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-medium">Booking cancelled</h1>
        <p className="mt-3 text-sm text-[#737373]">
          Cancelled bookings can&apos;t be reviewed.
        </p>
      </div>
    </div>
  );
}

function ExpiredView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4">
      <div className="max-w-sm rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-medium">Link expired</h1>
        <p className="mt-3 text-sm text-[#737373]">
          Review links expire 30 days after we send them. Contact your beauty
          pro if you&apos;d still like to leave feedback.
        </p>
      </div>
    </div>
  );
}
