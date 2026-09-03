import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarDays, Download, MailPlus } from "lucide-react";
import { getCurrentBusiness } from "@/lib/current-site";
import { createClient } from "@/lib/supabase/server";

interface Props {
  searchParams: Promise<{ siteId?: string }>;
}

function LinkCard({
  title,
  description,
  href,
  cta,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: typeof CalendarDays;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-[#E7E5E4] bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#F1EFEC] text-[#B8896B]">
          <Icon size={17} />
        </span>
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-[#737373]">{description}</p>
        </div>
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-[#0A0A0A] px-3 py-1.5 text-xs font-medium text-white hover:opacity-85"
      >
        {cta}
        <ArrowRight size={13} />
      </Link>
    </section>
  );
}

export default async function OperationsSettingsPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { siteId } = await searchParams;
  const business = await getCurrentBusiness(siteId);

  if (!business) {
    return (
      <section className="rounded-lg border border-[#E7E5E4] bg-white p-6">
        <h2 className="text-base font-semibold">Operations</h2>
        <p className="mt-1 text-sm text-[#737373]">
          Complete checkout first to configure operations.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <LinkCard
        title="Booking rules"
        description="Control slot intervals, last-minute cutoff, break time, and recurring daily blocks. Applies to new bookings only."
        href="/dashboard/settings/booking-rules"
        cta="Edit rules"
        icon={CalendarDays}
      />

      <LinkCard
        title="Exports"
        description="Download contacts, bookings, and income as portable files. Reachable even if billing lapses or your storefront is paused."
        href="/dashboard/settings/exports"
        cta="Open exports"
        icon={Download}
      />

      <LinkCard
        title="Rebook reminders"
        description="Tune how long OYRB waits after a visit before prompting clients to book their next hair, nail, lash, brow, or skin appointment."
        href="/dashboard/settings/rebook"
        cta="Edit reminders"
        icon={MailPlus}
      />
    </div>
  );
}
