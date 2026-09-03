/* eslint-disable react-hooks/purity */
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/current-site";
import {
  IMMEDIATE_EFFECTS,
  DURING_GRACE,
  FINAL_DELETION,
  REMOVAL_GRACE_PERIOD_DAYS,
} from "@/lib/remove-brand/confirmation-copy";
import { ConfirmForm } from "./confirm-form";
import { RestorePanel } from "./restore-panel";

/**
 * Phase 8 PR 4 — Remove Brand confirmation page.
 *
 * Two states:
 *   1. Pre-initiation (most pros, most of the time) → renders the
 *      three "what" info cards, export quick-links, and the
 *      confirmation form (two checkboxes + business name + CTA).
 *   2. In-grace (pro already initiated, hasn't restored yet) →
 *      renders the deletion date, the countdown, and a one-click
 *      Restore action. The dashboard layout banner is also visible
 *      on this state; this page mirrors that affordance and adds
 *      the timeline detail.
 *
 * Reachable while past-due or strike-paused (settings/* is on the
 * proxy exempt list, src/proxy.ts:18-22). Pros locked out by either
 * gate can still initiate or restore removal here.
 */

interface Props {
  searchParams: Promise<{ siteId?: string; restored?: string }>;
}

function fmtDateLong(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function RemoveBrandPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId, restored } = await searchParams;
  const business = await getCurrentBusiness(siteId);
  if (!business) {
    return (
      <div className="max-w-2xl">
        <h1 className="font-display text-2xl font-medium tracking-tight">
          Remove your brand
        </h1>
        <p className="mt-4 text-sm text-[#737373]">
          Complete checkout first.
        </p>
      </div>
    );
  }

  const buildHref = (path: string) =>
    siteId ? `${path}?siteId=${encodeURIComponent(siteId)}` : path;

  // Scheduled deletion date — read from the row if already in grace,
  // computed as a preview otherwise. The preview is informational
  // only; the actual write happens server-side at submit time.
  const scheduledFor = business.removal_scheduled_for
    ? new Date(business.removal_scheduled_for)
    : new Date(Date.now() + REMOVAL_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const dateLabel = fmtDateLong(scheduledFor);

  const inGrace = !!business.removal_initiated_at;

  return (
    <div className="max-w-2xl">
      <Link
        href="/dashboard/settings/general"
        className="inline-flex items-center gap-1 text-xs text-[#737373] hover:text-[#0A0A0A]"
      >
        <ArrowLeft size={12} /> Back to Settings
      </Link>

      {restored === "1" && !inGrace && (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Your brand is restored. Everything is back where you left it.
        </div>
      )}

      <h1 className="mt-3 font-display text-2xl font-medium tracking-tight">
        Remove your brand from OYRB
      </h1>

      {inGrace ? (
        <RestorePanel
          businessName={business.business_name}
          scheduledFor={scheduledFor}
        />
      ) : (
        <PreInitiationView
          businessName={business.business_name}
          dateLabel={dateLabel}
          buildHref={buildHref}
        />
      )}
    </div>
  );
}

function PreInitiationView({
  businessName,
  dateLabel,
  buildHref,
}: {
  businessName: string;
  dateLabel: string;
  buildHref: (path: string) => string;
}) {
  return (
    <>
      <p className="mt-2 text-sm leading-relaxed text-[#525252]">
        This starts a {REMOVAL_GRACE_PERIOD_DAYS}-day removal window. Your
        storefront comes down today; your account deletes on{" "}
        <strong>{dateLabel}</strong>. You can restore your brand at any
        point during those {REMOVAL_GRACE_PERIOD_DAYS} days — from this
        page or from the dashboard banner.
      </p>

      <InfoCard title="What happens immediately" items={IMMEDIATE_EFFECTS} />
      <InfoCard
        title={`What you can still do during the ${REMOVAL_GRACE_PERIOD_DAYS} days`}
        items={DURING_GRACE}
      />
      <InfoCard
        title={`What disappears on ${dateLabel}`}
        items={FINAL_DELETION}
      />

      <div className="mt-8 rounded-lg border border-[#E7E5E4] bg-white p-6">
        <h2 className="text-sm font-semibold text-[#0A0A0A]">
          Have you downloaded your data?
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-[#737373]">
          Take a portable copy before you go — these CSVs are yours to keep.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={buildHref("/api/dashboard/exports/contacts")}
            download
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#F5F5F4]"
          >
            <Download size={12} /> Contacts CSV
          </a>
          <a
            href={buildHref("/api/dashboard/exports/bookings")}
            download
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#F5F5F4]"
          >
            <Download size={12} /> Booking history CSV
          </a>
          <a
            href={buildHref("/api/dashboard/exports/income")}
            download
            className="inline-flex items-center gap-1.5 rounded-md border border-[#E7E5E4] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#F5F5F4]"
          >
            <Download size={12} /> Income CSV
          </a>
        </div>
      </div>

      <div className="mt-8 border-t border-[#E7E5E4] pt-8">
        <div className="flex items-start gap-3">
          <ShieldAlert
            size={18}
            strokeWidth={1.5}
            className="mt-0.5 shrink-0 text-amber-700"
          />
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-[#0A0A0A]">
              Confirm removal
            </h2>
            <p className="mt-0.5 text-xs leading-relaxed text-[#737373]">
              Both confirmations and your business name are required.
              Restoring later is one click; this isn&apos;t.
            </p>
          </div>
        </div>
        <div className="mt-5">
          <ConfirmForm businessName={businessName} dateLabel={dateLabel} />
        </div>
      </div>
    </>
  );
}

function InfoCard({
  title,
  items,
}: {
  title: string;
  items: readonly string[];
}) {
  return (
    <div className="mt-6 rounded-lg border border-[#E7E5E4] bg-[#FAFAF9] p-5">
      <h2 className="text-sm font-semibold text-[#0A0A0A]">{title}</h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[#525252]">
        {items.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
