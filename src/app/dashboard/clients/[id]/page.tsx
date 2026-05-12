import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import { defaultIntervalFor } from "@/lib/rebook-intervals";
import { BentoGrid } from "../../_components/bento-grid";
import { HeroTile } from "./_tiles/hero";
import { VisitsTile } from "./_tiles/visits-tile";
import { SpendTile } from "./_tiles/spend-tile";
import { ContactTile } from "./_tiles/contact-tile";
import {
  BookingHistoryTile,
  type HistoryBooking,
} from "./_tiles/booking-history-tile";
import {
  TopServicesTile,
  type TopService,
} from "./_tiles/top-services-tile";
import { NotesTile } from "./_tiles/notes-tile";

/**
 * Phase 9 PR 5 — Client detail page bento layout.
 *
 * Replaces the linear edit-form page with a 7-tile bento:
 *
 *   Row 1: Hero (avatar + name + badges + Edit CTA) — full width
 *   Row 2: Visits | Spend | Contact
 *   Row 3-4: Booking history (4-col × 2-row) || Top services + Notes
 *            (stacked 2-col)
 *
 * Optional bottom row: Import-source banner when imported_via_id is set.
 *
 * Edit is a modal triggered from the hero (or by clicking the Notes
 * tile). The existing ClientEditForm + its nested SMS consent reset
 * modal are reused unchanged; the new EditTrigger wraps them in an
 * outer modal that mounts the form on demand.
 *
 * Existence-leak posture preserved: a client that doesn't belong to
 * the caller's business returns the same 404 as a non-existent id.
 */

const HISTORY_LIMIT = 12;

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ siteId?: string }>;
}

type ClientRow = {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  visit_count: number | null;
  marketing_opt_in: boolean;
  marketing_opt_in_at: string | null;
  sms_consent: boolean;
  sms_consent_at: string | null;
  loyalty_reward_available: boolean | null;
  imported_via_id: string | null;
  created_at: string;
};

type BookingRow = {
  id: string;
  start_at: string;
  status: string;
  services: { name: string | null; price_cents: number | null } | null;
};

export default async function ClientDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { siteId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await getCurrentBusiness(siteId);
  if (!business) notFound();

  // Phase 1: client row + bookings in parallel (both indexed by id /
  // client_id, no dependency on each other).
  const [{ data: clientRaw }, { data: bookingsRaw }] = await Promise.all([
    supabase
      .from("clients")
      .select(
        "id, business_id, name, email, phone, notes, visit_count, marketing_opt_in, marketing_opt_in_at, sms_consent, sms_consent_at, loyalty_reward_available, imported_via_id, created_at",
      )
      .eq("id", id)
      .eq("business_id", business.id)
      .maybeSingle(),
    supabase
      .from("bookings")
      .select("id, start_at, status, services(name, price_cents)")
      .eq("client_id", id)
      .order("start_at", { ascending: false }),
  ]);

  if (!clientRaw) notFound();
  const client = clientRaw as ClientRow;
  const allBookings = (bookingsRaw ?? []) as unknown as BookingRow[];

  // Phase 2: optional import metadata lookup (only when imported).
  // Runs after phase 1 because it depends on client.imported_via_id.
  type ImportMeta = {
    vendor_hint: string | null;
    source_filename: string | null;
    created_at: string;
  };
  let importMeta: ImportMeta | null = null;
  if (client.imported_via_id) {
    const { data: imp } = await supabase
      .from("client_imports")
      .select("vendor_hint, source_filename, created_at")
      .eq("id", client.imported_via_id)
      .maybeSingle();
    importMeta = (imp as unknown as ImportMeta | null) ?? null;
  }

  // Derived stats. All computed from the bookings array — no
  // additional round trips.
  const nonCancelled = allBookings.filter((b) => b.status !== "cancelled");
  const totalVisits = nonCancelled.length;
  const lifetimeCents = nonCancelled.reduce(
    (sum, b) => sum + (b.services?.price_cents ?? 0),
    0,
  );

  // Last visit — most-recent non-cancelled by start_at.
  const lastVisitAt = nonCancelled.length > 0
    ? new Date(nonCancelled[0].start_at)
    : null;

  // Suggested next — last visit + business default rebook interval.
  // Mirrors the clients list page's per-row computation.
  const intervalDays = defaultIntervalFor(business.service_category);
  const suggestedNext = lastVisitAt
    ? new Date(lastVisitAt.getTime() + intervalDays * 24 * 60 * 60 * 1000)
    : null;

  // Top services — count by services.name across non-cancelled bookings.
  // Ranked desc; deleted services fall back to a recognizable label.
  const serviceCounts = new Map<string, number>();
  for (const b of nonCancelled) {
    const name = b.services?.name ?? "(deleted service)";
    serviceCounts.set(name, (serviceCounts.get(name) ?? 0) + 1);
  }
  const topServices: TopService[] = Array.from(serviceCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Booking history — last HISTORY_LIMIT (12). totalCount drives the
  // "Showing last 12 of N" footer when truncated.
  const historyBookings: HistoryBooking[] = allBookings
    .slice(0, HISTORY_LIMIT)
    .map((b) => ({
      id: b.id,
      startAt: new Date(b.start_at),
      serviceName: b.services?.name ?? "(deleted service)",
      status: b.status,
      priceCents: b.services?.price_cents ?? null,
    }));

  const editInitial = {
    name: client.name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    notes: client.notes ?? "",
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-1 text-xs text-[#737373] transition-colors hover:text-[#0A0A0A]"
      >
        <ChevronLeft size={12} strokeWidth={1.5} />
        All clients
      </Link>

      <div className="mt-4">
        <BentoGrid>
          <HeroTile
            clientId={client.id}
            name={client.name}
            createdAt={client.created_at}
            marketingOptIn={client.marketing_opt_in}
            smsConsent={client.sms_consent}
            loyaltyRewardAvailable={!!client.loyalty_reward_available}
            initial={editInitial}
          />
          <VisitsTile
            totalVisits={totalVisits}
            lastVisitAt={lastVisitAt}
            suggestedNext={suggestedNext}
          />
          <SpendTile
            lifetimeCents={lifetimeCents}
            totalVisits={totalVisits}
          />
          <ContactTile email={client.email} phone={client.phone} />
          <BookingHistoryTile
            bookings={historyBookings}
            totalCount={allBookings.length}
          />
          <TopServicesTile services={topServices} />
          <NotesTile
            clientId={client.id}
            clientName={client.name}
            notes={client.notes ?? ""}
            initial={editInitial}
            smsConsent={client.sms_consent}
          />
        </BentoGrid>
      </div>

      {/* Import-source banner — only when this client was created
          via a Phase 7 CSV import. Sits below the bento because
          it's provenance, not active data. */}
      {importMeta && (
        <div className="mt-6 flex items-start gap-2 rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] px-4 py-3 text-xs text-[#525252]">
          <Upload size={13} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[#737373]" />
          <span>
            Imported from{" "}
            <span className="font-medium text-[#0A0A0A]">
              {importMeta.vendor_hint ?? "unknown vendor"}
            </span>
            {importMeta.source_filename && (
              <> — <span className="font-mono">{importMeta.source_filename}</span></>
            )}{" "}
            on {new Date(importMeta.created_at).toLocaleDateString()}.
          </span>
        </div>
      )}

      <p className="mt-6 text-xs text-[#737373]">
        Editing a phone number on an SMS-opted-in client requires re-opt-in
        for legal compliance.{" "}
        <Link href="/dashboard/clients" className="underline hover:text-[#0A0A0A]">
          Back to all clients
        </Link>
        .
      </p>
    </div>
  );
}
