import { Download, Lock } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";

/**
 * Phase 8 PR 1 — Exports landing page.
 *
 * Three tiles: one live (contacts), two placeholders (bookings, income).
 * PRs 2 and 3 will replace the placeholders with their own download
 * tiles using the same data_exports audit table.
 *
 * This page is reachable when the dashboard is in past-due or strike-
 * pause state because /dashboard/settings/* sits on the proxy exempt
 * list (src/proxy.ts:18-22). Pros locked out of bookings can still
 * pull their data here.
 */

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

export default async function ExportsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);
  if (!business) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Exports
        </h1>
        <p className="mt-4 text-sm text-[#737373]">
          Complete checkout first.
        </p>
      </div>
    );
  }

  // siteId is forwarded into the API route so the export targets the
  // same business the pro is currently viewing in the dashboard.
  const downloadHref = siteId
    ? `/api/dashboard/exports/contacts?siteId=${encodeURIComponent(siteId)}`
    : "/api/dashboard/exports/contacts";

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-medium tracking-tight">
        Exports
      </h1>
      <p className="mt-1 text-sm text-[#737373]">
        Download your data as portable CSV files. Your data stays on OYRB
        regardless — these exports are for your own records, migration to
        another platform, or pre-deletion backup.
      </p>

      <div className="mt-8 space-y-4">
        {/* Contacts — live */}
        <div className="rounded-lg border border-[#E7E5E4] bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-base font-semibold">Contacts</h2>
              <p className="mt-0.5 text-xs text-[#737373]">
                Your full client list — name, contact info, notes, booking
                count, last visit, marketing and SMS consent status, and
                import source. One row per client.
              </p>
            </div>
            <a
              href={downloadHref}
              download
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-85"
            >
              <Download size={14} /> Download CSV
            </a>
          </div>
        </div>

        {/* Booking history — placeholder */}
        <PlaceholderTile
          title="Booking history"
          body="Every booking on record — service, client, time, status, deposit. Coming in the next release."
        />

        {/* Income — placeholder */}
        <PlaceholderTile
          title="Income"
          body="Revenue ledger across confirmed bookings — service, client, gross, deposit, date. Coming after booking history."
        />
      </div>
    </div>
  );
}

function PlaceholderTile({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-base font-semibold text-[#525252]">{title}</h2>
          <p className="mt-0.5 text-xs text-[#737373]">{body}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium text-[#A3A3A3]">
          <Lock size={12} /> Coming soon
        </span>
      </div>
    </div>
  );
}
