import { Download } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";

/**
 * Phase 8 — Exports landing page.
 *
 * Three live tiles: contacts, booking history, income. Zero
 * placeholders. The "coming soon" PlaceholderTile that lived here
 * through PR #55 and PR #56 was deleted when Income shipped (PR #57).
 *
 * Reachable when the dashboard is in past-due or strike-pause state
 * because /dashboard/settings/* sits on the proxy exempt list
 * (src/proxy.ts:18-22). Pros locked out of bookings can still pull
 * all three CSVs here — billing-pending and strike-paused now point
 * pros at this page directly (Phase 8 PR 3) so they can choose which
 * data they need rather than being pre-routed to contacts.
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

        <div>
          <LiveTile
            title="Income"
            body="Gross revenue and OYRB-captured payments (deposits + balances) for every booking. One row per booking. Cents shown as USD with two decimals."
            href={buildHref("/api/dashboard/exports/income")}
          />
          {/* Reconciliation note — explains the four always-blank
              columns (tip, refund, application fee, processing fee)
              and points the pro at their Stripe 1099-K. Rendered
              inline next to the tile so pros see it BEFORE clicking
              download. Not duplicated inside the CSV itself. */}
          <p className="mt-2 px-1 text-xs leading-relaxed text-[#737373]">
            Income CSV reports gross revenue and the amounts OYRB captured
            for you (deposits + balances paid through Stripe Connect).
            Stripe processing fees, OYRB application fees, refunds, and
            tips aren&apos;t tracked here — reconcile those against your
            Stripe 1099-K. This file is your gross sales; your accountant
            subtracts fees and refunds, and adds tips, to get your net.
          </p>
        </div>
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
