"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BarChart3, CalendarDays, Globe2, Settings } from "lucide-react";

const tabs = [
  {
    label: "General & Billing",
    href: "/dashboard/settings/general",
    icon: Settings,
    matches: [
      "/dashboard/settings",
      "/dashboard/settings/general",
      "/dashboard/settings/payments",
      "/dashboard/settings/domain",
      "/dashboard/settings/remove-brand",
    ],
  },
  {
    label: "Operations",
    href: "/dashboard/settings/operations",
    icon: CalendarDays,
    matches: [
      "/dashboard/settings/operations",
      "/dashboard/settings/booking",
      "/dashboard/settings/booking-rules",
      "/dashboard/settings/exports",
      "/dashboard/settings/rebook",
    ],
  },
  {
    label: "Public Presence",
    href: "/dashboard/settings/public-presence",
    icon: Globe2,
    matches: ["/dashboard/settings/public-presence"],
  },
  {
    label: "Goals",
    href: "/dashboard/settings/goals",
    icon: BarChart3,
    matches: ["/dashboard/settings/goals"],
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
    <div className="sticky top-0 z-20 -mx-1 mt-5 overflow-x-auto border-b border-[#E7E5E4] bg-[#FAFAF9]/95 pb-0.5 pt-1 backdrop-blur">
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
              className={`relative inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${
                active
                  ? "border-[#B8896B]/40 bg-[#F1EFEC] text-[#0A0A0A] shadow-sm after:absolute after:inset-x-2 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-[#B8896B]"
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
