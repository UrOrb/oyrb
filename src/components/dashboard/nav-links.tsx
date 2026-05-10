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
  Upload,
  Clock,
  Mail,
  CreditCard,
  Settings,
  HelpCircle,
  LifeBuoy,
  Flame,
} from "lucide-react";
import { dispatchHelpToggle } from "@/app/dashboard/help-panel";

// Single source of truth for dashboard navigation. Both the desktop
// `Sidebar` and the mobile `MobileNav` drawer render through this
// component, so the item list, active-state logic, badge handling,
// and Help/Contact bottom block can never drift between surfaces.

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
  { label: "Imports", href: "/dashboard/clients/imports", icon: Upload },
  { label: "Marketing", href: "/dashboard/marketing", icon: Mail },
  { label: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

type Props = {
  /** Count of incoming pro_referrals in 'pending' state for the active business. */
  pendingTrustedPros?: number;
  /** Fires after a nav-link tap or the Help button click. The mobile
   *  drawer uses this to close itself; desktop sidebar leaves it
   *  undefined (no-op). */
  onNavigate?: () => void;
};

export function DashboardNavLinks({ pendingTrustedPros = 0, onNavigate }: Props) {
  const pathname = usePathname();
  const badges: Record<string, number> = {
    pendingTrustedPros,
  };

  // Pick exactly one active item by longest-prefix match, so a
  // sub-route like /dashboard/clients/imports doesn't simultaneously
  // light up both "Clients" and "Imports" — only the most-specific
  // entry wins. Dashboard root is exact-only (any /dashboard/* would
  // otherwise share its prefix). Sub-routes still highlight their
  // parent if no more-specific entry matches, which is what keeps
  // /dashboard/settings/booking-rules under "Settings".
  const activeHref = (() => {
    if (pathname === "/dashboard") return "/dashboard";
    let best: string | null = null;
    for (const { href } of NAV) {
      if (href === "/dashboard") continue;
      if (pathname === href || pathname.startsWith(`${href}/`)) {
        if (!best || href.length > best.length) best = href;
      }
    }
    return best;
  })();

  const handleHelp = () => {
    dispatchHelpToggle();
    onNavigate?.();
  };

  return (
    <>
      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {NAV.map(({ label, href, icon: Icon, badgeKey }) => {
          const active = href === activeHref;
          const badge = badgeKey ? badges[badgeKey] : 0;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
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
          onClick={handleHelp}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[#525252] transition-colors hover:bg-[#F5F5F4] hover:text-[#0A0A0A]"
        >
          <HelpCircle size={16} strokeWidth={1.5} />
          Help
        </button>
        <Link
          href="/dashboard/support"
          onClick={onNavigate}
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
    </>
  );
}
