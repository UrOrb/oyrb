import type { SupabaseClient } from "@supabase/supabase-js";
import { formatCsvWithBom, type CsvOutput } from "./format";

/**
 * Phase 8 PR 3 — Income CSV builder.
 *
 * Booking-level granularity (Scope B from the discovery report):
 *   gross + deposit collected + balance collected, plus four
 *   honestly-blank columns (tip / refund / application_fee /
 *   processing_fee) that the surface copy on /dashboard/settings/exports
 *   explains. Net-to-pro stays blank for the same reason — it's the
 *   computed delta and we don't have the subtractors.
 *
 * Includes ALL statuses (pending / confirmed / cancelled / completed).
 * Cancelled bookings with paid non-refunded deposits ARE revenue;
 * filtering happens in Excel, not here. Mirrors the bookings CSV
 * convention from PR #56.
 *
 * Two queries, in-memory merge:
 *
 *   1. bookings + services + clients embed — same shape as bookings-csv.ts
 *   2. gift_cards by business_id, scoped to rows where
 *      redeemed_booking_id is not null — looked up to flag bookings
 *      that were paid via a redeemed gift card (payment_method =
 *      gift_card_redeemed). Gift card SALES themselves are out of
 *      scope here (deferred to an optional 4th tile in Phase 8.5);
 *      this lookup is purely to label redemption rows correctly.
 *
 * Per-booking revenue math mirrors lib/business-brain.ts:862-869:
 *   gross               = services.price_cents          (sticker)
 *   deposit_collected   = deposit_paid ? services.deposit_cents : ""
 *   balance_collected   = paid_in_full_at ? paid_amount_cents  : ""
 *   total_oyrb          = "" if BOTH legs are blank,
 *                         else deposit_collected + balance_collected
 *
 * The total goes blank (not 0.00) when there is no payment data on
 * either leg — preserves the "" vs 0.00 distinction ("not applicable"
 * vs "zero collected") that the deposit/balance cells use. A booking
 * priced at 0 that was paid through Stripe still shows 0.00 in the
 * total — meaningful zero, not missing data.
 *
 * paid_amount_cents semantics (mig 020): for a deposit-then-balance
 * booking it is the BALANCE only; for a fully-upfront booking it is
 * the FULL price. Either way, total_oyrb = deposit + balance is
 * correct because deposit is zero in the upfront case.
 *
 * payment_method values: see derivePaymentMethod below — five-way
 * union (gift_card_redeemed | stripe | mixed | manual | unpaid).
 *
 * appointment_date/_time formatted in the pro's timezone
 * (businesses.timezone, fallback America/New_York). Audit timestamps
 * stay ISO 8601 UTC, matching the bookings CSV.
 *
 * USD formatting: (cents/100).toFixed(2), no $, no commas. Empty
 * string "" for "not applicable" — distinguishes "no data" from
 * "zero." Always-blank columns emit "" forever (or until a Phase 8.5
 * webhook/migration backfills them).
 */

// ── 23 columns, locked order ─────────────────────────────────────────
// Drives the Papa.unparse `fields` AND the per-row object keys.
// Keep them in sync.
const INCOME_COLUMNS = [
  // Appointment identity
  "appointment_date",
  "appointment_time",
  "client_name",
  "service_name",
  "status",
  "booking_source",
  // Money — what we know
  "gross_amount_usd",
  "payment_method",
  "deposit_collected_usd",
  "deposit_collected_at",
  "balance_collected_usd",
  "balance_collected_at",
  "total_oyrb_collected_usd",
  // Money — honest gaps (always blank in this PR; surface copy on
  // /dashboard/settings/exports explains why and how to reconcile).
  "tip_amount_usd",
  "refund_amount_usd",
  "application_fee_usd",
  "processing_fee_usd",
  "net_to_pro_usd",
  // Cross-references
  "stripe_payment_intent_id",
  "booking_id",
  // Audit timestamps (UTC)
  "created_at",
  "completed_at",
  "cancelled_at",
] as const;

type BookingRow = {
  id: string;
  start_at: string;
  status: string;
  deposit_paid: boolean | null;
  paid_in_full_at: string | null;
  paid_amount_cents: number | null;
  stripe_payment_intent_id: string | null;
  booking_source: string | null;
  created_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  services: { name: string | null; price_cents: number; deposit_cents: number } | null;
  clients: { name: string | null } | null;
};

type GiftCardLookup = {
  redeemed_booking_id: string;
};

export type IncomeCsv = CsvOutput;

const DEFAULT_TZ = "America/New_York";

/**
 * Derives the payment_method column value for one booking row.
 *
 * Priority order (each branch wins over later ones):
 *
 *   gift_card_redeemed — booking id appears in
 *                        gift_cards.redeemed_booking_id
 *   stripe             — both deposit_paid AND paid_in_full_at fired
 *   mixed              — exactly one of deposit_paid / paid_in_full_at
 *                        fired (deposit-only, or upfront pay-in-full
 *                        without a prior deposit)
 *   manual             — booking_source = 'manual' (pro typed this in
 *                        from /dashboard/bookings, so the assumption
 *                        is they're collecting payment offline)
 *   unpaid             — booking exists, no Stripe payment captured,
 *                        not a manual entry. Public-widget bookings
 *                        that never paid a deposit (free services, or
 *                        pros using OYRB for scheduling and collecting
 *                        elsewhere) and series children of a
 *                        deposit-paid parent both land here. The
 *                        prior version of this helper labelled these
 *                        rows `manual`, which was misleading next to
 *                        booking_source=public_widget.
 *
 * Exported for testability / future re-use; pure function.
 */
export function derivePaymentMethod(
  bookingId: string,
  depositPaid: boolean | null,
  paidInFullAt: string | null,
  bookingSource: string | null,
  giftCardRedeemedIds: Set<string>,
): "gift_card_redeemed" | "stripe" | "mixed" | "manual" | "unpaid" {
  if (giftCardRedeemedIds.has(bookingId)) return "gift_card_redeemed";
  const hadDeposit = !!depositPaid;
  const hadBalance = !!paidInFullAt;
  if (hadDeposit && hadBalance) return "stripe";
  if (hadDeposit !== hadBalance) return "mixed";
  if (bookingSource === "manual") return "manual";
  return "unpaid";
}

function centsToUsd(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

export async function buildIncomeCsv(
  supabase: SupabaseClient,
  businessId: string,
  timezone: string | null,
): Promise<IncomeCsv> {
  const tz = timezone && timezone.trim().length > 0 ? timezone : DEFAULT_TZ;

  // Pre-built formatters — one allocation per request, not per row.
  // en-CA gives YYYY-MM-DD; en-GB gives 24h HH:mm without AM/PM.
  // Same convention as bookings-csv.ts.
  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // ── 1. Bookings ────────────────────────────────────────────────────
  const { data: bookingsData } = await supabase
    .from("bookings")
    .select(
      [
        "id",
        "start_at",
        "status",
        "deposit_paid",
        "paid_in_full_at",
        "paid_amount_cents",
        "stripe_payment_intent_id",
        "booking_source",
        "created_at",
        "completed_at",
        "cancelled_at",
        "services(name, price_cents, deposit_cents)",
        "clients(name)",
      ].join(","),
    )
    .eq("business_id", businessId)
    .order("start_at", { ascending: false });

  const bookings = (bookingsData ?? []) as unknown as BookingRow[];

  // ── 2. Gift-card redemption lookup ─────────────────────────────────
  // Only the redeemed_booking_id is needed — the gift card's amount,
  // buyer, and code are out of scope for this PR. Scoped to this
  // business to avoid leaking across tenants (the RLS policy on
  // gift_cards is pro-only-reads, but we still filter explicitly).
  const giftCardRedeemedIds = new Set<string>();
  const { data: giftCards } = await supabase
    .from("gift_cards")
    .select("redeemed_booking_id")
    .eq("business_id", businessId)
    .not("redeemed_booking_id", "is", null);
  for (const gc of (giftCards ?? []) as GiftCardLookup[]) {
    if (gc.redeemed_booking_id) giftCardRedeemedIds.add(gc.redeemed_booking_id);
  }

  // ── 3. Per-row serialization ───────────────────────────────────────
  const rows = bookings.map((b) => {
    const start = new Date(b.start_at);
    const priceCents = b.services?.price_cents ?? 0;
    const depositCents = b.services?.deposit_cents ?? 0;

    const depositPaid = !!b.deposit_paid;
    const balancePaid = !!b.paid_in_full_at;

    // Empty string for "not applicable" — distinguishes "no data"
    // from "zero." A deposit that was paid is the deposit_cents on
    // the service at booking time (service can be deleted later;
    // we emit 0 when the embedded service is null, matching the
    // bookings CSV's "(deleted service)" convention).
    const depositUsd = depositPaid ? centsToUsd(depositCents) : "";
    const balanceUsd = balancePaid ? centsToUsd(b.paid_amount_cents) : "";

    // Total: blank when both legs are blank ("not applicable"),
    // otherwise the sum (which may legitimately be 0 if a service
    // priced at 0 was paid through Stripe — meaningful zero, not
    // "no data"). Matches the "" vs 0.00 convention for the
    // deposit/balance cells.
    const totalCollectedUsd =
      depositUsd === "" && balanceUsd === ""
        ? ""
        : centsToUsd(
            (depositPaid ? depositCents : 0) +
              (balancePaid ? (b.paid_amount_cents ?? 0) : 0),
          );

    const paymentMethod = derivePaymentMethod(
      b.id,
      b.deposit_paid,
      b.paid_in_full_at,
      b.booking_source,
      giftCardRedeemedIds,
    );

    // deposit_collected_at: we don't store a precise deposit
    // capture timestamp — the deposit Checkout completes inside
    // /api/public/bookings/confirm and the booking row is inserted
    // immediately after, so created_at is the best proxy. Pro can
    // cross-reference stripe_payment_intent_id in their Stripe
    // dashboard for the exact charge time if it matters.
    const depositCollectedAt = depositPaid ? b.created_at : "";

    return {
      appointment_date: dateFmt.format(start),
      appointment_time: timeFmt.format(start),
      client_name: b.clients?.name ?? "",
      service_name: b.services?.name ?? "(deleted service)",
      status: b.status,
      booking_source: b.booking_source ?? "",
      gross_amount_usd: centsToUsd(priceCents),
      payment_method: paymentMethod,
      deposit_collected_usd: depositUsd,
      deposit_collected_at: depositCollectedAt,
      balance_collected_usd: balanceUsd,
      balance_collected_at: b.paid_in_full_at ?? "",
      total_oyrb_collected_usd: totalCollectedUsd,
      // Always-blank columns — see surface copy on Exports page for
      // reconciliation guidance.
      tip_amount_usd: "",
      refund_amount_usd: "",
      application_fee_usd: "",
      processing_fee_usd: "",
      net_to_pro_usd: "",
      stripe_payment_intent_id: b.stripe_payment_intent_id ?? "",
      booking_id: b.id,
      created_at: b.created_at,
      completed_at: b.completed_at ?? "",
      cancelled_at: b.cancelled_at ?? "",
    };
  });

  return formatCsvWithBom(INCOME_COLUMNS, rows);
}
