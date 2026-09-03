"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, CreditCard, Globe, Settings } from "lucide-react";

const tabs = [
  {
    label: "General",
    href: "/dashboard/settings/general",
    icon: Settings,
    matches: [
      "/dashboard/settings",
      "/dashboard/settings/general",
      "/dashboard/settings/exports",
      "/dashboard/settings/remove-brand",
    ],
  },
  {
    label: "Booking",
    href: "/dashboard/settings/booking",
    icon: CalendarDays,
    matches: [
      "/dashboard/settings/booking",
      "/dashboard/settings/booking-rules",
      "/dashboard/settings/rebook",
    ],
  },
  {
    label: "Payments",
    href: "/dashboard/settings/payments",
    icon: CreditCard,
    matches: ["/dashboard/settings/payments"],
  },
  {
    label: "Domain & DNS",
    href: "/dashboard/settings/domain",
    icon: Globe,
    matches: ["/dashboard/settings/domain"],
  },
];

function isActive(pathname: string, matches: string[]) {
  return matches.some((match) => pathname === match || pathname.startsWith(`${match}/`));
}

export function SettingsTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const siteId = searchParams.get("siteId");

  return (
    <div className="-mx-1 mt-5 overflow-x-auto pb-1">
      <nav className="flex min-w-max gap-1 px-1" aria-label="Settings sections">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.matches);
          const Icon = tab.icon;
          const href = siteId ? `${tab.href}?siteId=${encodeURIComponent(siteId)}` : tab.href;

          return (
            <Link
              key={tab.href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
                active
                  ? "border-[#B8896B]/40 bg-[#F1EFEC] text-[#0A0A0A] shadow-sm"
                  : "border-transparent text-[#525252] hover:bg-[#FAFAF9] hover:text-[#0A0A0A]"
              }`}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
