"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LineChart,
  Globe,
  Scissors,
  CalendarDays,
  Users,
  Clock,
  Mail,
  CreditCard,
  Settings,
  HelpCircle,
  LifeBuoy,
  Flame,
} from "lucide-react";
import { dispatchHelpToggle } from "@/app/dashboard/help-panel";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  /** Optional pending-count badge for items like Trusted Pros. Hidden when 0. */
  badgeKey?: "pendingTrustedPros";
};

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Business Brain", href: "/dashboard/business-brain", icon: LineChart },
  { label: "Site", href: "/dashboard/site", icon: Globe },
  { label: "Services", href: "/dashboard/services", icon: Scissors },
  { label: "Bookings", href: "/dashboard/bookings", icon: CalendarDays },
  { label: "Trusted Pros", href: "/dashboard/pass-the-torch", icon: Flame, badgeKey: "pendingTrustedPros" },
  { label: "Waitlist", href: "/dashboard/waitlist", icon: Clock },
  { label: "Clients", href: "/dashboard/clients", icon: Users },
  { label: "Marketing", href: "/dashboard/marketing", icon: Mail },
  { label: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

type Props = {
  /** Count of incoming pro_referrals in 'pending' state for the active business. */
  pendingTrustedPros?: number;
};

export function Sidebar({ pendingTrustedPros = 0 }: Props) {
  const pathname = usePathname();
  const badges: Record<string, number> = {
    pendingTrustedPros,
  };

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-[#E7E5E4] bg-[#FAFAF9] md:flex">
      <div className="flex h-14 items-center border-b border-[#E7E5E4] px-6">
        <Link href="/" className="font-display text-base font-medium tracking-tight">
          OYRB
        </Link>
      </div>

      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {NAV.map(({ label, href, icon: Icon, badgeKey }) => {
          // The Dashboard root needs an exact match (otherwise every
          // /dashboard/* sub-route would also highlight it). All other
          // items highlight on their route OR any sub-route — this is
          // what makes Business Brain's Money / Time / Clients tabs
          // keep the sidebar entry highlighted, and is a UX
          // improvement for /dashboard/settings/booking-rules etc.
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === href || pathname.startsWith(`${href}/`);
          const badge = badgeKey ? badges[badgeKey] : 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-[#F5F5F4] font-medium text-[#0A0A0A]"
                  : "text-[#525252] hover:bg-[#F5F5F4] hover:text-[#0A0A0A]"
              }`}
            >
              <Icon size={16} strokeWidth={1.5} />
              <span className="flex-1">{label}</span>
              {badge > 0 && (
                <span
                  aria-label={`${badge} pending`}
                  className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#B8896B] px-1.5 text-[11px] font-semibold text-white"
                >
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Help + Contact Support — bottom block, separated from the
          primary nav. Help toggles the global HelpPanel (AI chat) mounted
          in the dashboard layout. Contact Support is a real route. */}
      <div className="flex flex-col gap-0.5 border-t border-[#E7E5E4] p-3">
        <button
          type="button"
          onClick={dispatchHelpToggle}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[#525252] transition-colors hover:bg-[#F5F5F4] hover:text-[#0A0A0A]"
        >
          <HelpCircle size={16} strokeWidth={1.5} />
          Help
        </button>
        <Link
          href="/dashboard/support"
          className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
            pathname === "/dashboard/support"
              ? "bg-[#F5F5F4] font-medium text-[#0A0A0A]"
              : "text-[#525252] hover:bg-[#F5F5F4] hover:text-[#0A0A0A]"
          }`}
        >
          <LifeBuoy size={16} strokeWidth={1.5} />
          Contact Support
        </Link>
      </div>
    </aside>
  );
}
