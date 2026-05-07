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
      className="flex flex-wrap gap-1 border-b border-[#E7E5E4]"
    >
      {TABS.map((t) => {
        const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            role="tab"
            aria-selected={active}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
              active
                ? "border-[#0A0A0A] font-semibold text-[#0A0A0A]"
                : "border-transparent text-[#737373] hover:text-[#0A0A0A]"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
