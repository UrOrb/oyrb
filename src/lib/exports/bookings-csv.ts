import type { SupabaseClient } from "@supabase/supabase-js";
import { formatCsvWithBom, type CsvOutput } from "./format";

/**
 * Phase 8 PR 2 — Booking history CSV builder.
 *
 * Pure function: caller supplies a Supabase client (anon-scoped under
 * the pro's session) and the business id + timezone; we return the
 * serialized CSV plus row count + byte size for the audit row.
 *
 * Times-of-day are formatted in the pro's timezone (businesses.timezone,
 * fallback America/New_York applied by the caller). Audit timestamps
 * — created_at, cancelled_at, rescheduled_at, previous_start_at — stay
 * in ISO 8601 UTC, mirroring the contacts CSV convention. The pro can
 * use the human-readable booking_date/start_time/end_time triple for
 * day-to-day reading and the ISO columns for spreadsheets that re-parse
 * timestamps.
 *
 * One round-trip via PostgREST embed — services(name) and
 * clients(name, email, phone) ride along on the bookings select. Both
 * FKs are ON DELETE SET NULL on the underlying table (001 migration),
 * so embedded objects come back null for orphaned bookings: deleted
 * service → service_name renders "(deleted service)"; deleted client
 * → name/email/phone render as empty strings.
 *
 * Serialization (BOM + Papa.unparse object form) is delegated to
 * formatCsvWithBom in ./format, shared with every other export.
 */

// 17-column order, locked. Drives the Papa.unparse `fields` AND the
// per-row object keys; keep them in sync.
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

// Hand-narrowed shape of the embedded select. The Supabase TS client
// can't infer nullable embedded objects reliably across versions, so
// we cast through `unknown` at the boundary and trust the runtime
// shape that mig 001 (and the existing /dashboard/bookings query at
// page.tsx:33) prove.
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
  // Embedded — null when the FK is null (orphaned by ON DELETE SET NULL).
  services: { name: string | null } | null;
  clients: {
    name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

export type BookingsCsv = CsvOutput;

const DEFAULT_TZ = "America/New_York";

export async function buildBookingsCsv(
  supabase: SupabaseClient,
  businessId: string,
  timezone: string | null,
): Promise<BookingsCsv> {
  const tz = timezone && timezone.trim().length > 0 ? timezone : DEFAULT_TZ;

  // Pre-built formatters — Intl.DateTimeFormat is allocation-heavy, so
  // we want one instance per request, not one per row. en-CA gives
  // YYYY-MM-DD for the date formatter; the time formatters use en-GB
  // for 24-hour HH:mm without AM/PM.
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

    // Deleted service → embedded `services` is null. Distinguish that
    // from "service intentionally absent" (currently impossible per the
    // insert paths, but defensive) by emitting "(deleted service)" only
    // when we'd otherwise have no name signal. Both render the same in
    // the CSV.
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
      deposit_paid: b.deposit_paid ? "true" : "false",
      created_at: b.created_at,
      cancelled_at: b.cancelled_at ?? "",
      cancelled_by: b.cancelled_by ?? "",
      cancel_reason: b.cancel_reason ?? "",
      rescheduled_at: b.rescheduled_at ?? "",
      previous_start_at: b.previous_start_at ?? "",
    };
  });

  return formatCsvWithBom(BOOKINGS_COLUMNS, rows);
}
