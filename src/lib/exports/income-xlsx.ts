import type { SupabaseClient } from "@supabase/supabase-js";
import { formatXlsxTable, type XlsxOutput } from "./xlsx";

/**
 * Income XLSX builder.
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
 * filtering happens in Excel, not here.
 *
 * USD columns emit numbers (not strings) so Excel SUM/AVG and column
 * sort work natively; the worksheet applies a currency numFmt so the
 * cells render with $ + thousands separators. Empty cells stay empty
 * — distinguishes "not applicable" from "$0.00" in the spreadsheet.
 *
 * Two queries, in-memory merge:
 *   1. bookings + services + clients embed
 *   2. gift_cards by business_id, scoped to redeemed_booking_id IS NOT
 *      NULL — used only to label rows that were paid via a redeemed
 *      gift card (payment_method = gift_card_redeemed).
 */

const INCOME_COLUMNS = [
  "appointment_date",
  "appointment_time",
  "client_name",
  "service_name",
  "status",
  "booking_source",
  "gross_amount_usd",
  "payment_method",
  "deposit_collected_usd",
  "deposit_collected_at",
  "balance_collected_usd",
  "balance_collected_at",
  "total_oyrb_collected_usd",
  "tip_amount_usd",
  "refund_amount_usd",
  "application_fee_usd",
  "processing_fee_usd",
  "net_to_pro_usd",
  "stripe_payment_intent_id",
  "booking_id",
  "created_at",
  "completed_at",
  "cancelled_at",
] as const;

type IncomeColumn = (typeof INCOME_COLUMNS)[number];

const USD_FORMAT = '"$"#,##0.00';

const INCOME_COLUMN_FORMATS: Partial<Record<IncomeColumn, string>> = {
  gross_amount_usd: USD_FORMAT,
  deposit_collected_usd: USD_FORMAT,
  balance_collected_usd: USD_FORMAT,
  total_oyrb_collected_usd: USD_FORMAT,
  tip_amount_usd: USD_FORMAT,
  refund_amount_usd: USD_FORMAT,
  application_fee_usd: USD_FORMAT,
  processing_fee_usd: USD_FORMAT,
  net_to_pro_usd: USD_FORMAT,
};

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

export type IncomeXlsx = XlsxOutput;

const DEFAULT_TZ = "America/New_York";

/**
 * Derives the payment_method column value for one booking row.
 *
 *   gift_card_redeemed — booking id appears in gift_cards.redeemed_booking_id
 *   stripe             — both deposit_paid AND paid_in_full_at fired
 *   mixed              — exactly one of deposit_paid / paid_in_full_at fired
 *   manual             — no Stripe payment state observed
 */
export function derivePaymentMethod(
  bookingId: string,
  depositPaid: boolean | null,
  paidInFullAt: string | null,
  giftCardRedeemedIds: Set<string>,
): "gift_card_redeemed" | "stripe" | "mixed" | "manual" {
  if (giftCardRedeemedIds.has(bookingId)) return "gift_card_redeemed";
  const hadDeposit = !!depositPaid;
  const hadBalance = !!paidInFullAt;
  if (hadDeposit && hadBalance) return "stripe";
  if (hadDeposit !== hadBalance) return "mixed";
  return "manual";
}

function centsToUsd(cents: number | null | undefined): number | "" {
  if (cents == null) return "";
  return cents / 100;
}

export async function buildIncomeXlsx(
  supabase: SupabaseClient,
  businessId: string,
  timezone: string | null,
): Promise<IncomeXlsx> {
  const tz = timezone && timezone.trim().length > 0 ? timezone : DEFAULT_TZ;

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

  const giftCardRedeemedIds = new Set<string>();
  const { data: giftCards } = await supabase
    .from("gift_cards")
    .select("redeemed_booking_id")
    .eq("business_id", businessId)
    .not("redeemed_booking_id", "is", null);
  for (const gc of (giftCards ?? []) as GiftCardLookup[]) {
    if (gc.redeemed_booking_id) giftCardRedeemedIds.add(gc.redeemed_booking_id);
  }

  const rows = bookings.map((b) => {
    const start = new Date(b.start_at);
    const priceCents = b.services?.price_cents ?? 0;
    const depositCents = b.services?.deposit_cents ?? 0;

    const depositPaid = !!b.deposit_paid;
    const balancePaid = !!b.paid_in_full_at;

    const depositUsd = depositPaid ? centsToUsd(depositCents) : "";
    const balanceUsd = balancePaid ? centsToUsd(b.paid_amount_cents) : "";

    const totalCollectedCents =
      (depositPaid ? depositCents : 0) +
      (balancePaid ? (b.paid_amount_cents ?? 0) : 0);

    const paymentMethod = derivePaymentMethod(
      b.id,
      b.deposit_paid,
      b.paid_in_full_at,
      giftCardRedeemedIds,
    );

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
      total_oyrb_collected_usd: centsToUsd(totalCollectedCents),
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
    } satisfies Record<IncomeColumn, unknown>;
  });

  return formatXlsxTable(INCOME_COLUMNS, rows, {
    sheetName: "Income",
    tableName: "Income",
    columnFormats: INCOME_COLUMN_FORMATS,
  });
}
