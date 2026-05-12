import { BentoTile } from "../bento-tile";

/**
 * Marketing tile — last campaign sent. Shows campaign name + sent date
 * + recipient count when one exists; empty-state CTA otherwise.
 *
 * OYRB doesn't track open rates today (no `open_rate` column on
 * email_campaigns; no opens logged elsewhere). So we surface
 * recipient_count instead — concrete and pulled from the existing
 * mig 005 schema. Adding open-rate tracking is its own future PR.
 */

export type LastCampaign = {
  name: string;
  sentAt: Date | null;
  recipientCount: number;
};

export function MarketingTile({
  lastCampaign,
}: {
  lastCampaign: LastCampaign | null;
}) {
  return (
    <BentoTile
      href="/dashboard/marketing"
      className="col-span-2 sm:col-span-2 lg:col-span-2"
      ariaLabel="Marketing"
    >
      <p className="text-sm font-semibold text-[#0A0A0A]">Marketing</p>

      {!lastCampaign ? (
        <p className="mt-2 text-xs leading-relaxed text-[#737373]">
          No campaigns yet. Most pros find their first email gets the best
          engagement.
        </p>
      ) : (
        <>
          <p className="mt-3 truncate text-sm font-medium text-[#0A0A0A]">
            {lastCampaign.name}
          </p>
          <p className="mt-1 text-xs text-[#737373]">
            {lastCampaign.sentAt
              ? `Sent ${formatRelativeSent(lastCampaign.sentAt)} · ${lastCampaign.recipientCount.toLocaleString("en-US")} recipient${lastCampaign.recipientCount === 1 ? "" : "s"}`
              : `${lastCampaign.recipientCount.toLocaleString("en-US")} recipient${lastCampaign.recipientCount === 1 ? "" : "s"}`}
          </p>
        </>
      )}
    </BentoTile>
  );
}

function formatRelativeSent(sentAt: Date): string {
  const now = new Date();
  const days = Math.floor((now.getTime() - sentAt.getTime()) / (24 * 60 * 60 * 1000));
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(sentAt);
}
