"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Horizontal tab bar for the Business Brain shell. Active tab is
 * derived from the URL pathname so each tab can be bookmarked. The
 * 4 placeholder tabs (Money / Time / Clients / Where They Come From)
 * link to "coming soon" pages until their respective phases ship.
 */
const TABS: Array<{ href: string; label: string }> = [
  { href: "/dashboard/business-brain/this-week", label: "This Week" },
  { href: "/dashboard/business-brain/money", label: "Money" },
  { href: "/dashboard/business-brain/time", label: "Time" },
  { href: "/dashboard/business-brain/clients", label: "Clients" },
  { href: "/dashboard/business-brain/where-they-come-from", label: "Where They Come From" },
];

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      role="tablist"
      aria-label="Business Brain tabs"
      className="-mx-1 flex gap-2 overflow-x-auto border-b border-[#E7E5E4] px-1 pb-2"
    >
      {TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            role="tab"
            aria-selected={active}
            aria-current={active ? "page" : undefined}
            className={`relative shrink-0 rounded-full border px-3.5 py-2 text-sm transition-colors ${
              active
                ? "border-[#B8896B]/35 bg-[#F1EFEC] font-semibold text-[#0A0A0A] after:absolute after:inset-x-4 after:-bottom-[11px] after:h-0.5 after:rounded-full after:bg-[#B8896B]"
                : "border-transparent text-[#737373] hover:bg-[#FAFAF9] hover:text-[#0A0A0A]"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
