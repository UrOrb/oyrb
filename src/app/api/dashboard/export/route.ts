import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// Returns a ZIP-like bundle of CSVs as a single downloadable JSON blob.
// Use JSON + base64 so we don't need zip libs; the client decodes into 4 CSV files.

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.join(",");
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const body = rows.map((r) => columns.map((c) => esc(r[c])).join(",")).join("\n");
  return `${header}\n${body}`;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!business) {
    return NextResponse.json({ error: "No business found" }, { status: 404 });
  }

  const [{ data: clients }, { data: bookings }, { data: services }, { data: hours }] = await Promise.all([
    admin.from("clients").select("*").eq("business_id", business.id).order("created_at"),
    admin.from("bookings").select("*").eq("business_id", business.id).order("start_at", { ascending: false }),
    admin.from("services").select("*").eq("business_id", business.id).order("name"),
    admin.from("business_hours").select("*").eq("business_id", business.id).order("day_of_week"),
  ]);

  const bundle = {
    exportedAt: new Date().toISOString(),
    business: {
      name: business.business_name,
      slug: business.slug,
      email: user.email,
      tier: business.subscription_tier,
      created_at: business.created_at,
    },
    files: {
      "clients.csv": toCsv(
        (clients ?? []) as Record<string, unknown>[],
        ["id", "name", "email", "phone", "notes", "created_at"]
      ),
      "bookings.csv": toCsv(
        (bookings ?? []) as Record<string, unknown>[],
        ["id", "service_id", "client_id", "start_at", "end_at", "status", "deposit_paid", "created_at"]
      ),
      "services.csv": toCsv(
        (services ?? []) as Record<string, unknown>[],
        ["id", "name", "description", "duration_minutes", "price_cents", "deposit_cents", "active", "created_at"]
      ),
      "business_hours.csv": toCsv(
        (hours ?? []) as Record<string, unknown>[],
        ["day_of_week", "is_open", "open_time", "close_time"]
      ),
    },
  };

  return NextResponse.json(bundle, {
    headers: {
      "Content-Disposition": `attachment; filename="oyrb-${business.slug}-export-${Date.now()}.json"`,
    },
  });
}
