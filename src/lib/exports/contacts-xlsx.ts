import type { SupabaseClient } from "@supabase/supabase-js";
import { formatXlsxTable, type XlsxOutput } from "./xlsx";

/**
 * Contacts XLSX builder. Pure(-ish) function: takes a Supabase client
 * (caller decides whether that's anon-scoped or service-role) plus a
 * business_id, returns the workbook buffer along with the row count
 * and byte size for the audit row.
 *
 * Aggregation logic mirrors src/app/dashboard/clients/page.tsx:56-91
 * verbatim — the same `status != 'cancelled'` filter on bookings —
 * so what lands in the workbook matches what the pro already sees on
 * the Clients page (booking count, last visit).
 *
 * Boolean columns (loyalty_reward_available, marketing_opt_in,
 * sms_consent) emit real booleans so Excel renders TRUE/FALSE and the
 * autofilter offers two clean buckets. Counts are typed as numbers so
 * SUM/AVG and column sort work natively.
 *
 * Order of operations:
 *   1. clients query (one round-trip, full row)
 *   2. bookings query scoped to the client ids we just loaded
 *      (single round-trip, same shape as the Clients page)
 *   3. client_imports join via clients.imported_via_id, so the
 *      import_source column can render "<vendor> CSV — <filename>"
 *   4. in-process rollup
 *   5. formatXlsxTable — ListObject + autofilter, shared with every
 *      other export under src/lib/exports/*
 */

const CONTACTS_COLUMNS = [
  "name",
  "email",
  "phone",
  "notes",
  "date_added",
  "last_booked_at",
  "total_bookings",
  "visit_count",
  "loyalty_reward_available",
  "marketing_opt_in",
  "marketing_opt_in_at",
  "marketing_opt_in_source",
  "sms_consent",
  "sms_consent_at",
  "sms_consent_source",
  "import_source",
] as const;

type ContactsColumn = (typeof CONTACTS_COLUMNS)[number];

const CONTACTS_COLUMN_FORMATS: Partial<Record<ContactsColumn, string>> = {
  total_bookings: "0",
  visit_count: "0",
};

type ClientRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  visit_count: number | null;
  loyalty_reward_available: boolean | null;
  marketing_opt_in: boolean | null;
  marketing_opt_in_at: string | null;
  marketing_opt_in_source: string | null;
  sms_consent: boolean | null;
  sms_consent_at: string | null;
  sms_consent_source: string | null;
  imported_via_id: string | null;
};

type BookingForRollup = {
  client_id: string;
  end_at: string;
  status: string;
};

type ImportLookup = {
  id: string;
  vendor_hint: string | null;
  source_filename: string | null;
};

export type ContactsXlsx = XlsxOutput;

export async function buildContactsXlsx(
  supabase: SupabaseClient,
  businessId: string,
): Promise<ContactsXlsx> {
  // ── 1. Clients ─────────────────────────────────────────────────────
  // Select only the columns we serialize. sms_consent_ip and
  // sms_consent_user_agent are excluded by design (sensitive legal-
  // record provenance — not pro-portable).
  const { data: clientsData } = await supabase
    .from("clients")
    .select(
      [
        "id",
        "name",
        "email",
        "phone",
        "notes",
        "created_at",
        "visit_count",
        "loyalty_reward_available",
        "marketing_opt_in",
        "marketing_opt_in_at",
        "marketing_opt_in_source",
        "sms_consent",
        "sms_consent_at",
        "sms_consent_source",
        "imported_via_id",
      ].join(","),
    )
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  const clients = (clientsData ?? []) as unknown as ClientRow[];

  // ── 2. Bookings rollup ─────────────────────────────────────────────
  // Mirrors clients/page.tsx:56-91. One round-trip; in-process group
  // by client_id. Filter to status != 'cancelled' when computing
  // last-visit and total-booking-count so the workbook matches the
  // dashboard counts the pro already sees.
  const clientIds = clients.map((c) => c.id);
  const bookingsByClient = new Map<string, BookingForRollup[]>();
  if (clientIds.length > 0) {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("client_id, end_at, status")
      .in("client_id", clientIds);
    for (const raw of (bookings ?? []) as BookingForRollup[]) {
      if (!raw.client_id) continue;
      const arr = bookingsByClient.get(raw.client_id) ?? [];
      arr.push(raw);
      bookingsByClient.set(raw.client_id, arr);
    }
  }

  // ── 3. Imports lookup ──────────────────────────────────────────────
  // Only fetch import metadata for clients that actually came from an
  // import. Cheap join; cardinality is bounded by the number of past
  // imports (typically < 10 even for active pros).
  const importIds = Array.from(
    new Set(
      clients
        .map((c) => c.imported_via_id)
        .filter((id): id is string => !!id),
    ),
  );
  const importsById = new Map<string, ImportLookup>();
  if (importIds.length > 0) {
    const { data: imports } = await supabase
      .from("client_imports")
      .select("id, vendor_hint, source_filename")
      .in("id", importIds);
    for (const imp of (imports ?? []) as ImportLookup[]) {
      importsById.set(imp.id, imp);
    }
  }

  // ── 4. Per-row serialization ───────────────────────────────────────
  const rows = clients.map((c) => {
    const bs = bookingsByClient.get(c.id) ?? [];
    const confirmed = bs.filter((b) => b.status !== "cancelled");
    const last =
      confirmed
        .map((b) => new Date(b.end_at))
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    const imp = c.imported_via_id ? importsById.get(c.imported_via_id) : null;
    const importSource = imp
      ? `${imp.vendor_hint ?? "unknown"} CSV — ${imp.source_filename ?? ""}`.trim()
      : "";

    return {
      name: c.name ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      notes: c.notes ?? "",
      date_added: c.created_at,
      last_booked_at: last ? last.toISOString() : "",
      total_bookings: confirmed.length,
      visit_count: c.visit_count ?? 0,
      loyalty_reward_available: !!c.loyalty_reward_available,
      marketing_opt_in: !!c.marketing_opt_in,
      marketing_opt_in_at: c.marketing_opt_in_at ?? "",
      marketing_opt_in_source: c.marketing_opt_in_source ?? "",
      sms_consent: !!c.sms_consent,
      sms_consent_at: c.sms_consent_at ?? "",
      sms_consent_source: c.sms_consent_source ?? "",
      import_source: importSource,
    } satisfies Record<ContactsColumn, unknown>;
  });

  return formatXlsxTable(CONTACTS_COLUMNS, rows, {
    sheetName: "Contacts",
    tableName: "Contacts",
    columnFormats: CONTACTS_COLUMN_FORMATS,
  });
}
