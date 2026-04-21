import Link from "next/link";
import { resolveToken } from "@/lib/booking-tokens";
import { createAdminClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/types";
import { googleCalendarUrl } from "@/lib/ics";
import { BookingActions } from "./booking-actions";

// Magic-link pages must not be indexable. The metadata below plus robots.ts
// entries ensure search crawlers skip them.
export const metadata = {
  robots: { index: false, follow: false },
  title: "Your booking — OYRB",
};

export const dynamic = "force-dynamic"; // token pages are per-request
export const revalidate = 0;

type Props = { params: Promise<{ token: string }> };

type BookingRow = {
  id: string;
  business_id: string;
  start_at: string;
  end_at: string;
  status: string;
  deposit_paid: boolean | null;
  cancelled_at: string | null;
  services: { name: string; price_cents: number; description: string | null } | null;
  clients: { name: string; email: string | null; phone: string | null } | null;
  businesses: {
    business_name: string;
    slug: string;
    contact_email: string | null;
    phone: string | null;
  } | null;
};

export default async function BookingTokenPage({ params }: Props) {
  const { token } = await params;
  const resolved = await resolveToken(token);

  if (!resolved) {
    return <NotFoundView />;
  }

  if (resolved.expired) {
    return <ExpiredView email={resolved.clientEmail} />;
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("bookings")
    .select(`
      id, business_id, start_at, end_at, status, deposit_paid, cancelled_at,
      services(name, price_cents, description),
      clients(name, email, phone),
      businesses(business_name, slug, contact_email, phone)
    `)
    .eq("id", resolved.bookingId)
    .maybeSingle();

  const booking = data as unknown as BookingRow | null;
  if (!booking || !booking.services || !booking.businesses || !booking.clients) {
    return <NotFoundView />;
  }

  const startAt = new Date(booking.start_at);
  const endAt = new Date(booking.end_at);
  const cancelled = booking.status === "cancelled";

  const whenLabel = startAt.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const gcalUrl = googleCalendarUrl({
    uid: booking.id,
    start: startAt,
    end: endAt,
    title: `${booking.services.name} with ${booking.businesses.business_name}`,
    description: booking.services.description ?? "",
    location: booking.businesses.business_name,
    url: `https://www.oyrb.space/s/${booking.businesses.slug}`,
  });

  const siteUrl = `/s/${booking.businesses.slug}`;

  return (
    <div className="min-h-screen bg-[#FAFAF9] py-12 px-4">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B8896B]">
            {cancelled ? "Booking cancelled" : "Your booking"}
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium">
            {cancelled ? "This appointment was cancelled." : `Hi, ${booking.clients.name}.`}
          </h1>
          {!cancelled && (
            <p className="mt-2 text-sm text-[#737373]">
              Your appointment with <strong>{booking.businesses.business_name}</strong> is locked in.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[#E7E5E4] bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <Row label="Service" value={booking.services.name} />
            <Row label="When" value={whenLabel} />
            <Row label="Price" value={formatCents(booking.services.price_cents)} />
            {booking.deposit_paid && <Row label="Deposit" value="Paid ✓" />}
            <Row label="Pro" value={booking.businesses.business_name} />
            {booking.businesses.phone && <Row label="Contact" value={booking.businesses.phone} />}
          </div>

          {!cancelled && (
            <div className="mt-6 flex flex-wrap gap-2 border-t border-[#E7E5E4] pt-6">
              <a
                href={gcalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full bg-[#0A0A0A] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Add to Google Calendar
              </a>
              <a
                href={`/api/public/bookings/ics/${encodeURIComponent(token)}`}
                className="inline-flex items-center rounded-full border border-[#E7E5E4] px-4 py-2 text-sm font-semibold hover:bg-[#FAFAF9]"
              >
                Download .ics (Apple / Outlook)
              </a>
            </div>
          )}

          {!cancelled && (
            <BookingActions
              token={token}
              businessName={booking.businesses.business_name}
            />
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-[#E7E5E4] bg-white p-6 text-sm">
          <p className="font-medium">More from {booking.businesses.business_name}</p>
          <Link href={siteUrl} className="mt-2 inline-block text-sm text-[#B8896B] underline">
            Browse their services →
          </Link>
        </div>

        <p className="mt-8 text-center text-[11px] text-[#A3A3A3]">
          This link expires on {resolved.expiresAt.toLocaleDateString()}. Manage your{" "}
          <Link href={`/preferences/${token}`} className="underline">
            email preferences
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#737373]">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-[#0A0A0A]">{value}</p>
    </div>
  );
}

function ExpiredView({ email: _email }: { email: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4">
      <div className="max-w-sm rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-medium">This link has expired</h1>
        <p className="mt-3 text-sm text-[#737373]">
          For your security, booking access links expire after 7 days. Contact your service provider
          directly — they can resend a fresh link or help you with any changes.
        </p>
      </div>
    </div>
  );
}

function NotFoundView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] p-4">
      <div className="max-w-sm rounded-2xl border border-[#E7E5E4] bg-white p-8 text-center shadow-sm">
        <h1 className="font-display text-2xl font-medium">Link not found</h1>
        <p className="mt-3 text-sm text-[#737373]">
          This booking link isn&apos;t valid. Check that you copied the full URL, or contact your
          service provider.
        </p>
      </div>
    </div>
  );
}
