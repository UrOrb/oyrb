import Link from "next/link";
import { resolveToken } from "@/lib/booking-tokens";
import { createAdminClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { formatCents } from "@/lib/types";

export const metadata = {
  robots: { index: false, follow: false },
  title: "Payment received — OYRB",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

// Stripe redirects here after the hosted checkout. If the webhook has
// already marked the booking paid_in_full we show a confirmation
// immediately; otherwise we fall back to reading the Stripe session to
// verify payment_status === "paid" so the client isn't stuck on a
// "processing" page while the webhook is still in flight.
export default async function PaySuccessPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { session_id } = await searchParams;

  const resolved = await resolveToken(token);
  if (!resolved) {
    return <GenericErrorView />;
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("bookings")
    .select(`
      id, paid_in_full_at, paid_amount_cents,
      services(name),
      businesses(business_name, slug)
    `)
    .eq("id", resolved.bookingId)
    .maybeSingle();

  const booking = data as unknown as {
    id: string;
    paid_in_full_at: string | null;
    paid_amount_cents: number | null;
    services: { name: string } | null;
    businesses: { business_name: string; slug: string } | null;
  } | null;

  if (!booking || !booking.services || !booking.businesses) {
    return <GenericErrorView />;
  }

  // Fast path — webhook already updated the booking.
  let paidAmount = booking.paid_amount_cents;
  let isPaid = !!booking.paid_in_full_at;

  // Race with the webhook: if Stripe says "paid" but our DB hasn't
  // caught up yet, we still render the success view. The webhook will
  // reconcile the row shortly (emails + paid_in_full_at stamp).
  if (!isPaid && session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session.payment_status === "paid") {
        isPaid = true;
        paidAmount = session.amount_total ?? paidAmount;
      }
    } catch (err) {
      console.error("Could not retrieve Stripe session on success page:", err);
    }
  }

  if (!isPaid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4">
        <div className="max-w-sm rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center shadow-sm">
          <h1 className="font-display text-2xl font-medium">Still processing…</h1>
          <p className="mt-3 text-sm text-[#737373]">
            Your payment is being verified. Refresh in a few seconds, or
            return to your booking.
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4">
      <div className="max-w-md rounded-2xl border border-[#E7E5E4] bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
          <span aria-hidden className="text-3xl">✓</span>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
          Payment received
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium">
          You&apos;re all set.
        </h1>
        <p className="mt-3 text-sm text-[#525252]">
          {paidAmount ? `${formatCents(paidAmount)} ` : ""}
          received by <strong>{booking.businesses.business_name}</strong>. No
          balance due at your appointment.
        </p>
        <p className="mt-4 text-xs text-[#A3A3A3]">
          A receipt has been emailed to you. {booking.businesses.business_name}{" "}
          also received a copy.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Link
            href={`/booking/${token}`}
            className="rounded-full border border-[#E7E5E4] px-5 py-2 text-sm font-semibold hover:bg-[#FAFAF9]"
          >
            View my booking
          </Link>
          <Link
            href={`/s/${booking.businesses.slug}`}
            className="rounded-full bg-[#0A0A0A] px-5 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Visit {booking.businesses.business_name}
          </Link>
        </div>
      </div>
    </div>
  );
}

function GenericErrorView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4">
      <div className="max-w-sm rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-medium">Something went wrong</h1>
        <p className="mt-3 text-sm text-[#737373]">
          We couldn&apos;t look up your booking. If your card was charged,
          contact your beauty pro directly — they can see the payment on
          their dashboard.
        </p>
      </div>
    </div>
  );
}
