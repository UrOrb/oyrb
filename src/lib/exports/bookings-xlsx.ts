import type { SupabaseClient } from "@supabase/supabase-js";
import { formatXlsxTable, type XlsxOutput } from "./xlsx";

/**
 * Booking history XLSX builder.
 *
 * Pure function: caller supplies a Supabase client (anon-scoped under
 * the pro's session) and the business id + timezone; we return the
 * Excel workbook buffer plus row count + byte size for the audit row.
 *
 * Times-of-day are formatted in the pro's timezone (businesses.timezone,
 * fallback America/New_York applied here as defense in depth). Audit
 * timestamps — created_at, cancelled_at, rescheduled_at,
 * previous_start_at — stay in ISO 8601 UTC. The pro can use the
 * human-readable booking_date/start_time/end_time triple for day-to-day
 * reading and the ISO columns for spreadsheets that re-parse timestamps.
 *
 * deposit_paid is emitted as a real boolean so Excel renders TRUE/FALSE
 * and the autofilter offers two clean buckets.
 *
 * One round-trip via PostgREST embed — services(name) and
 * clients(name, email, phone) ride along on the bookings select. Both
 * FKs are ON DELETE SET NULL on the underlying table (001 migration),
 * so embedded objects come back null for orphaned bookings: deleted
 * service → service_name renders "(deleted service)"; deleted client
 * → name/email/phone render as empty strings.
 */

const BOOKINGS_COLUMNS = [
  "booking_date",
  "start_time",
  "end_time",
  "duration_minutes",
  "service_name",
  "client_name",
  "client_email",
  "client_phone",
  "status",
  "booking_source",
  "deposit_paid",
  "created_at",
  "cancelled_at",
  "cancelled_by",
  "cancel_reason",
  "rescheduled_at",
  "previous_start_at",
] as const;

type BookingsColumn = (typeof BOOKINGS_COLUMNS)[number];

const BOOKINGS_COLUMN_FORMATS: Partial<Record<BookingsColumn, string>> = {
  duration_minutes: "0",
};

type BookingRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  deposit_paid: boolean | null;
  booking_source: string | null;
  created_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  rescheduled_at: string | null;
  previous_start_at: string | null;
  services: { name: string | null } | null;
  clients: {
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

export type BookingsXlsx = XlsxOutput;

const DEFAULT_TZ = "America/New_York";

export async function buildBookingsXlsx(
  supabase: SupabaseClient,
  businessId: string,
  timezone: string | null,
): Promise<BookingsXlsx> {
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
        "end_at",
        "status",
        "deposit_paid",
        "booking_source",
        "created_at",
        "cancelled_at",
        "cancelled_by",
        "cancel_reason",
        "rescheduled_at",
        "previous_start_at",
        "services(name)",
        "clients(name, email, phone)",
      ].join(","),
    )
    .eq("business_id", businessId)
    .order("start_at", { ascending: false });

  const bookings = (bookingsData ?? []) as unknown as BookingRow[];

  const rows = bookings.map((b) => {
    const start = new Date(b.start_at);
    const end = new Date(b.end_at);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.max(0, Math.round(durationMs / 60000));

    const serviceName = b.services?.name ?? "(deleted service)";

    return {
      booking_date: dateFmt.format(start),
      start_time: timeFmt.format(start),
      end_time: timeFmt.format(end),
      duration_minutes: durationMinutes,
      service_name: serviceName,
      client_name: b.clients?.name ?? "",
      client_email: b.clients?.email ?? "",
      client_phone: b.clients?.phone ?? "",
      status: b.status,
      booking_source: b.booking_source ?? "",
      deposit_paid: !!b.deposit_paid,
      created_at: b.created_at,
      cancelled_at: b.cancelled_at ?? "",
      cancelled_by: b.cancelled_by ?? "",
      cancel_reason: b.cancel_reason ?? "",
      rescheduled_at: b.rescheduled_at ?? "",
      previous_start_at: b.previous_start_at ?? "",
    } satisfies Record<BookingsColumn, unknown>;
  });

  return formatXlsxTable(BOOKINGS_COLUMNS, rows, {
    sheetName: "Bookings",
    tableName: "Bookings",
    columnFormats: BOOKINGS_COLUMN_FORMATS,
  });
}
