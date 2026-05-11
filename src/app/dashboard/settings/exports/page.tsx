import { Download, Lock } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";

/**
 * Phase 8 — Exports landing page.
 *
 * Two live tiles (contacts + booking history) and one placeholder
 * (income, lands in PR 3 against the same data_exports table).
 *
 * Reachable when the dashboard is in past-due or strike-pause state
 * because /dashboard/settings/* sits on the proxy exempt list
 * (src/proxy.ts:18-22). Pros locked out of bookings can still pull
 * their data here.
 *
 * LiveTile and PlaceholderTile are kept local to this file on purpose
 * — promoting them to a shared component before income (PR 3) ships
 * would be N=2 abstraction. Revisit then.
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

  // siteId is forwarded into each API route so the export targets the
  // same business the pro is currently viewing in the dashboard.
  const buildHref = (path: string) =>
    siteId ? `${path}?siteId=${encodeURIComponent(siteId)}` : path;

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
        <LiveTile
          title="Contacts"
          body="Your full client list — name, contact info, notes, booking count, last visit, marketing and SMS consent status, and import source. One row per client."
          href={buildHref("/api/dashboard/exports/contacts")}
        />

        <LiveTile
          title="Booking history"
          body="Every appointment you've had — service, client, status, and cancellation history. Times are in your timezone. One row per booking."
          href={buildHref("/api/dashboard/exports/bookings")}
        />

        <PlaceholderTile
          title="Income"
          body="Revenue ledger across confirmed bookings — service, client, gross, deposit, date. Coming after booking history."
        />
      </div>
    </div>
  );
}

function LiveTile({
  title,
  body,
  href,
}: {
  title: string;
  body: string;
  href: string;
}) {
  return (
    <div className="rounded-lg border border-[#E7E5E4] bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs text-[#737373]">{body}</p>
        </div>
        <a
          href={href}
          download
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-85"
        >
          <Download size={14} /> Download CSV
        </a>
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
