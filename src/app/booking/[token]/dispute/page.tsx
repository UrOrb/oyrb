import { resolveToken } from "@/lib/booking-tokens";
import { createAdminClient } from "@/lib/supabase/server";
import { FILEABLE_BOOKING_STATUSES } from "@/lib/disputes";
import { DisputeFilingForm } from "./dispute-filing-form";
import Link from "next/link";

export const metadata = {
  robots: { index: false, follow: false },
  title: "File a Dispute Inquiry — OYRB",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ token: string }> };

export default async function DisputeFilingPage({ params }: Props) {
  const { token } = await params;
  const resolved = await resolveToken(token);

  if (!resolved || resolved.expired) {
    return <ExpiredView />;
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("bookings")
    .select(`
      id, status,
      businesses(business_name)
    `)
    .eq("id", resolved.bookingId)
    .maybeSingle();

  const booking = data as unknown as {
    id: string;
    status: string;
    businesses: { business_name: string } | null;
  } | null;

  if (!booking || !booking.businesses) {
    return <NotFoundView />;
  }
  if (!FILEABLE_BOOKING_STATUSES.includes(booking.status)) {
    return <NotEligibleView />;
  }

  // Check if a client-filed dispute already exists for this booking.
  const { data: existing } = await supabase
    .from("dispute_inquiries")
    .select("id")
    .eq("booking_id", booking.id)
    .eq("reporter_type", "client")
    .maybeSingle();
  if (existing) {
    return <AlreadyFiledView token={token} />;
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <DisputeFilingForm token={token} proName={booking.businesses.business_name} />
    </main>
  );
}

function ExpiredView() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-medium">This link has expired</h1>
      <p className="mt-3 text-sm text-[#737373]">
        Booking access links expire after 7 days. Contact your beauty professional directly for
        help.
      </p>
    </main>
  );
}

function NotFoundView() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-medium">Link not found</h1>
      <p className="mt-3 text-sm text-[#737373]">
        This dispute filing link isn&apos;t valid. Check that you copied the full URL.
      </p>
    </main>
  );
}

function NotEligibleView() {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-medium">Not eligible for an inquiry</h1>
      <p className="mt-3 text-sm text-[#737373]">
        Dispute Inquiries can be filed only on confirmed, completed, or cancelled bookings.
      </p>
    </main>
  );
}

function AlreadyFiledView({ token }: { token: string }) {
  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-medium">Inquiry already filed</h1>
      <p className="mt-3 text-sm text-[#737373]">
        You&apos;ve already filed a Dispute Inquiry for this booking. Watch your email for status
        updates.
      </p>
      <Link
        href={`/booking/${token}`}
        className="mt-4 inline-block text-sm text-[#B8896B] underline"
      >
        Back to booking
      </Link>
    </main>
  );
}
