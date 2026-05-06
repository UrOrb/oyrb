import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingHeader } from "../booking-header";
import { BookingClientCard } from "../booking-client-card";
import { BookingServiceCard } from "../booking-service-card";
import { BookingActionsPanel } from "../booking-actions-panel";
import { NotificationTimeline } from "../notification-timeline";

export const metadata = {
  title: "Booking — OYRB",
};

type Props = { params: Promise<{ id: string }> };

type BookingDetail = {
  id: string;
  business_id: string;
  status: string;
  start_at: string;
  end_at: string;
  created_at: string;
  cancelled_at: string | null;
  deposit_paid: boolean | null;
  paid_in_full_at: string | null;
  paid_amount_cents: number | null;
  stripe_payment_intent_id: string | null;
  age_is_minor: boolean | null;
  guardian_name: string | null;
  services: {
    name: string;
    description: string | null;
    duration_minutes: number;
    price_cents: number;
  } | null;
  clients: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    sms_consent: boolean | null;
  } | null;
  businesses: {
    id: string;
    slug: string;
    owner_id: string;
    business_name: string;
  } | null;
};

/**
 * Pro-facing booking detail page.
 *
 * 404 vs 403: an unauthorized viewer (someone else's pro account, or
 * an unauthenticated user) gets a 404 — we don't leak the existence of
 * the booking by returning 403. Spec rule.
 *
 * ── Forward-extension map ──────────────────────────────────────────
 * The page is a vertical card stack so future phases can add panels
 * without restructuring. Slots reserved for:
 *
 *   • Phase 2.1 — <DisputeInquiryPanel /> (per-booking dispute history,
 *     evidence submission, current strike weight).
 *   • Phase 3.1 — <ServiceTimingPanel /> (actual start/end vs scheduled,
 *     pro-side timing notes).
 *   • PR #22 — pro-side Reschedule action plugs into BookingActionsPanel
 *     alongside the existing Cancel control.
 *
 * Each new panel is a self-contained card. Keep this stack flat — no
 * tabs, no accordions. Pros scan top-to-bottom on mobile.
 */
export default async function BookingDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: bookingRaw } = await supabase
    .from("bookings")
    .select(
      `id, business_id, status, start_at, end_at, created_at, cancelled_at,
       deposit_paid, paid_in_full_at, paid_amount_cents, stripe_payment_intent_id,
       age_is_minor, guardian_name,
       services(name, description, duration_minutes, price_cents),
       clients(id, name, email, phone, notes, sms_consent),
       businesses(id, slug, owner_id, business_name)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!bookingRaw) notFound();
  const booking = bookingRaw as unknown as BookingDetail;

  // 404 (not 403) if the booking exists but belongs to a different pro.
  // We don't leak existence to unauthorized viewers.
  if (
    !booking.businesses ||
    booking.businesses.owner_id !== user.id ||
    !booking.services ||
    !booking.clients
  ) {
    notFound();
  }

  const startAt = new Date(booking.start_at);
  const endAt = new Date(booking.end_at);
  const now = new Date();
  const showCancel =
    booking.status === "confirmed" && startAt > now;

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <BookingHeader
        serviceName={booking.services.name}
        status={booking.status}
        startAt={startAt}
        endAt={endAt}
        cancelledAt={booking.cancelled_at}
      />

      <div className="mt-6 space-y-4">
        <BookingClientCard
          clientName={booking.clients.name}
          clientEmail={booking.clients.email}
          clientPhone={booking.clients.phone}
          clientNotes={booking.clients.notes}
          smsConsent={!!booking.clients.sms_consent}
          ageIsMinor={!!booking.age_is_minor}
          guardianName={booking.guardian_name}
        />

        <BookingServiceCard
          serviceName={booking.services.name}
          serviceDescription={booking.services.description}
          durationMinutes={booking.services.duration_minutes}
          priceCents={booking.services.price_cents}
          depositPaid={!!booking.deposit_paid}
          paidInFullAt={booking.paid_in_full_at}
          paidAmountCents={booking.paid_amount_cents}
          stripePaymentIntentId={booking.stripe_payment_intent_id}
        />

        <BookingActionsPanel
          bookingId={booking.id}
          status={booking.status}
          startAt={startAt}
          endAt={endAt}
          serviceName={booking.services.name}
          serviceDescription={booking.services.description}
          businessName={booking.businesses.business_name}
          businessSlug={booking.businesses.slug}
          showCancel={showCancel}
        />

        <NotificationTimeline bookingId={booking.id} />

        {/*
          Future panels render here in this same vertical stack:
            • Phase 2.1 — <DisputeInquiryPanel bookingId={booking.id} />
            • Phase 3.1 — <ServiceTimingPanel bookingId={booking.id} />
          See the file-level "Forward-extension map" comment at the top.
        */}
      </div>
    </div>
  );
}
