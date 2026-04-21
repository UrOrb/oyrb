import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveToken } from "@/lib/booking-tokens";
import { createAdminClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/types";
import { PayButton } from "./pay-button";

// Magic-link pages are always per-request + never indexable.
export const metadata = {
  robots: { index: false, follow: false },
  title: "Pay for your booking — OYRB",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { params: Promise<{ token: string }> };

type BookingRow = {
  id: string;
  start_at: string;
  status: string;
  deposit_paid: boolean | null;
  paid_in_full_at: string | null;
  paid_amount_cents: number | null;
  services: {
    name: string;
    price_cents: number;
    deposit_cents: number | null;
  } | null;
  clients: { name: string; email: string | null } | null;
  businesses: { business_name: string; slug: string } | null;
};

export default async function PayBookingPage({ params }: Props) {
  // Feature flag: until the pro explicitly enables it, the pay-now surface
  // simply doesn't exist publicly. 404 (not "not enabled") is deliberate —
  // no fingerprint for anyone poking around URLs.
  if (process.env.PAY_NOW_ENABLED !== "true") notFound();

  const { token } = await params;
  const resolved = await resolveToken(token);
  if (!resolved || resolved.expired) return <ExpiredView />;

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("bookings")
    .select(`
      id, start_at, status, deposit_paid, paid_in_full_at, paid_amount_cents,
      services(name, price_cents, deposit_cents),
      clients(name, email),
      businesses(business_name, slug)
    `)
    .eq("id", resolved.bookingId)
    .maybeSingle();

  const booking = data as unknown as BookingRow | null;
  if (!booking || !booking.services || !booking.businesses || !booking.clients) {
    return <NotFoundView />;
  }
  if (booking.status === "cancelled") return <CancelledView />;

  const { price_cents, deposit_cents } = booking.services;
  const depositPaid = !!booking.deposit_paid;
  const depositCents = depositPaid ? (deposit_cents ?? 0) : 0;
  const balanceCents = Math.max(0, price_cents - depositCents);

  // Already paid in full — show a receipt-ish state instead of sending them
  // back through checkout (Stripe would still accept, but it's bad UX).
  if (booking.paid_in_full_at || balanceCents === 0) {
    return (
      <PaidView
        businessName={booking.businesses.business_name}
        token={token}
        paidAmountCents={booking.paid_amount_cents ?? price_cents}
      />
    );
  }

  const startAt = new Date(booking.start_at);
  const whenLabel = startAt.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-[#FAFAF9] py-12 px-4">
      <div className="mx-auto max-w-md">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B8896B]">
            Pay for your service
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium">
            Hi {booking.clients.name},
          </h1>
          <p className="mt-2 text-sm text-[#737373]">
            Pay ahead and skip the card swipe at your appointment with{" "}
            <strong>{booking.businesses.business_name}</strong>.
          </p>
        </div>

        <div className="rounded-2xl border border-[#E7E5E4] bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <Row label="Service" value={booking.services.name} />
            <Row label="When" value={whenLabel} />
            <Row label="Service total" value={formatCents(price_cents)} />
            {depositPaid && (
              <Row
                label="Deposit already paid"
                value={`− ${formatCents(deposit_cents ?? 0)}`}
                valueClassName="text-emerald-700"
              />
            )}
            <div className="border-t border-[#E7E5E4] pt-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">
                Balance due today
              </p>
              <p className="mt-0.5 text-2xl font-semibold text-[#0A0A0A]">
                {formatCents(balanceCents)}
              </p>
            </div>
          </div>

          <PayButton token={token} balanceCents={balanceCents} />

          <p className="mt-4 text-[11px] text-[#A3A3A3]">
            Secure payment powered by Stripe. Your card isn&apos;t stored on
            OYRB. If your card is declined you&apos;ll be returned here to
            try another.
          </p>
        </div>

        <Link
          href={`/booking/${token}`}
          className="mt-6 block text-center text-xs text-[#A3A3A3] underline"
        >
          ← Back to my booking
        </Link>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">
        {label}
      </p>
      <p className={`text-sm font-semibold text-[#0A0A0A] ${valueClassName ?? ""}`}>
        {value}
      </p>
    </div>
  );
}

function PaidView({
  businessName,
  token,
  paidAmountCents,
}: {
  businessName: string;
  token: string;
  paidAmountCents: number;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4">
      <div className="max-w-sm rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
          Paid in full ✓
        </p>
        <h1 className="mt-2 font-display text-2xl font-medium">
          You&apos;re all set.
        </h1>
        <p className="mt-3 text-sm text-[#737373]">
          {formatCents(paidAmountCents)} received by {businessName}. No balance
          due at your appointment.
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

function ExpiredView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4">
      <div className="max-w-sm rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-medium">This link has expired</h1>
        <p className="mt-3 text-sm text-[#737373]">
          Booking access links expire after 7 days. Contact your beauty pro
          directly to pay at your appointment, or ask for a fresh link.
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
          This link isn&apos;t valid. Check the URL in your confirmation email.
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
          This booking was cancelled, so there&apos;s nothing left to pay.
        </p>
      </div>
    </div>
  );
}
